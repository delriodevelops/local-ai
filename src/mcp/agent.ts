import type { ChatCompletionMessageParam, ResponseFormat } from '@mlc-ai/web-llm'
import { generate } from '@/engine/engine'
import type { ToolCall } from '@/flow/types'
import { firstLine } from './args'
import { callTool, checkArguments } from './client'
import type { McpServer, McpTool } from './types'

// Un agente con herramientas MCP sobre el modelo local. Se descarga con el resto de MCP, solo si se usa

// name: como lo ve el modelo (con el servidor delante si dos servidores tienen una herramienta con el mismo nombre)
export type AgentTool = { server: McpServer; tool: McpTool; name: string }

type AgentOptions = {
  instructions: string
  input: string
  tools: AgentTool[]
  // Llamadas a herramientas como máximo, entre todas las respuestas
  maxSteps: number
  temperature: number
  maxTokens: number
  signal: AbortSignal
  // Antes de cada respuesta, mientras espera turno en el modelo; y cuando lo consigue
  onQueued: () => void
  onStart: () => void
  onText: (text: string) => void
  onStatus: (status: string | undefined) => void
  onCalls: (calls: ToolCall[]) => void
}

// El formato con el que Qwen y Hermes aprendieron a llamar herramientas
const OPEN = '<tool_call>'
const CLOSE = '</tool_call>'
// Los modelos pequeños tienen 4096 tokens de contexto: cada resultado entra recortado
const RESULT_LIMIT = 1500

// Las instrucciones de herramientas con las que se entrenó Qwen 2.5, palabra por palabra: con otra redacción,
// los modelos pequeños contestan de memoria en lugar de llamar
function systemPrompt(instructions: string, tools: AgentTool[]) {
  const signatures = tools.map(t => JSON.stringify({
    type: 'function',
    function: { name: t.name, description: firstLine(t.tool.description || t.tool.title, 300), parameters: t.tool.inputSchema },
  }))
  return `${instructions.trim() || 'You are a helpful assistant.'}

# Tools

You may call one or more functions to assist with the user query.

You are provided with function signatures within <tools></tools> XML tags:
<tools>
${signatures.join('\n')}
</tools>

For each function call, return a json object with function name and arguments within ${OPEN}${CLOSE} XML tags:
${OPEN}
{"name": <function-name>, "arguments": <args-json-object>}
${CLOSE}`
}

// Al escribir <tool_call> el modelo queda obligado a nombrar una de las herramientas y a dar argumentos que
// cumplen su esquema; fuera de la etiqueta escribe libre
const toolFormat = (tools: AgentTool[]) => ({
  type: 'structural_tag',
  structural_tag: {
    type: 'structural_tag',
    format: {
      type: 'triggered_tags',
      triggers: [OPEN],
      tags: tools.map(t => ({
        type: 'tag',
        begin: `${OPEN}\n{"name": ${JSON.stringify(t.name)}, "arguments": `,
        content: { type: 'json_schema', json_schema: t.tool.inputSchema },
        end: `}\n${CLOSE}`,
      })),
    },
  },
}) as ResponseFormat

type Parsed = { name: string; args: Record<string, unknown> } | { invalid: string }

// Todas las llamadas de una respuesta: Qwen sabe pedir varias a la vez, y se hacen una detrás de otra
function parseCalls(reply: string): Parsed[] {
  const calls: Parsed[] = []
  let from = 0
  for (;;) {
    const start = reply.indexOf(OPEN, from)
    if (start < 0) break
    const end = reply.indexOf(CLOSE, start)
    const body = reply.slice(start + OPEN.length, end < 0 ? undefined : end).trim()
    try {
      const call = JSON.parse(body)
      const raw = call?.arguments ?? call?.parameters ?? {}
      const args = typeof raw === 'string' ? JSON.parse(raw) : raw
      calls.push(typeof call?.name === 'string' ? { name: call.name, args } : { invalid: body })
    } catch {
      calls.push({ invalid: body })
    }
    if (end < 0) break
    from = end + CLOSE.length
  }
  return calls
}

// Lo que se enseña mientras escribe: el texto sin la llamada a medio escribir
const visible = (text: string) => text.split(OPEN)[0].replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim()

const truncate = (text: string) => (text.length > RESULT_LIMIT ? `${text.slice(0, RESULT_LIMIT)}\n[…cut, ${text.length - RESULT_LIMIT} more characters]` : text)

// Un resultado no puede cerrar el turno ni abrir otros: los tokens de control del chat y las etiquetas de herramientas
// que traiga (documentación sobre ChatML, por ejemplo) se rompen con un espacio invisible
const defuse = (text: string) =>
  text.replace(/<\|/g, '<​|').replace(/<(\/?)(tool_call|tool_response|tools|think)>/gi, '<​$1$2>')

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

// El modelo vive en un worker y sus errores llegan como texto, no como Error
const isGrammarError = (error: unknown) =>
  /grammar|structural/i.test(error instanceof Error ? `${error.name} ${error.message}` : String(error))

export async function runAgent(o: AgentOptions) {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt(o.instructions, o.tools) },
    { role: 'user', content: o.input },
  ]
  const calls: ToolCall[] = []
  // Llamadas que ya salieron bien: repetirlas no aporta nada
  const done = new Set<string>()
  // Si un esquema no se deja convertir en gramática, el agente sigue sin ella y se comprueba al recibir la llamada
  let format: ResponseFormat | undefined = toolFormat(o.tools)
  let used = 0

  const ask = async (constrained: boolean) => {
    o.onQueued()
    const options = {
      temperature: constrained ? 0 : o.temperature,
      maxTokens: o.maxTokens,
      signal: o.signal,
      onStart: o.onStart,
      onToken: (text: string) => o.onText(visible(text)),
      repetitionPenalty: 1,
    }
    let reply: string | undefined
    if (constrained && format) {
      try {
        reply = await generate(messages, { ...options, responseFormat: format })
      } catch (error) {
        if (!isGrammarError(error)) throw error
        format = undefined
      }
    }
    reply ??= await generate(messages, options)
    // Parado a mitad: lo escrito no es ni una respuesta ni una llamada completa
    if (o.signal.aborted) throw new DOMException('Stopped', 'AbortError')
    return reply
  }

  const run = async (call: Parsed) => {
    if ('invalid' in call) {
      calls.push({ tool: '?', args: call.invalid, error: 'not valid JSON' })
      o.onCalls([...calls])
      return 'Error: the tool call was not valid JSON. Write it again exactly in the format shown.'
    }
    const entry: ToolCall = { tool: call.name, args: JSON.stringify(call.args) }
    calls.push(entry)
    o.onCalls([...calls])
    const target = o.tools.find(t => t.name === call.name)
    const key = `${call.name} ${entry.args}`
    let result: string
    const problem = target ? checkArguments(target.tool.inputSchema, call.args) : null
    if (!target) result = `Error: there is no tool called ${call.name}.`
    else if (done.has(key)) result = 'Error: you already made this exact call. Use its result above.'
    else if (problem) result = `Error: invalid arguments. ${problem}`
    else {
      o.onStatus(`Calling ${call.name}…`)
      try {
        const output = await callTool(target.server, target.tool.name, call.args, {
          signal: o.signal,
          onProgress: progress => o.onStatus(`${call.name} · ${progress}`),
        })
        result = output.text || (output.images.length ? '(the tool returned an image)' : '(empty result)')
        // Solo las que salieron bien: una que falló (red, servidor ocupado) se puede repetir
        done.add(key)
        entry.result = firstLine(result, 200)
      } catch (error) {
        if (o.signal.aborted) throw error
        result = `Error: ${message(error)}`
      }
      o.onStatus(undefined)
    }
    if (result.startsWith('Error: ')) entry.error = result.slice(7)
    o.onCalls([...calls])
    return result
  }

  for (;;) {
    // Con llamadas pendientes, la gramática obliga a que cada una sea válida; sin ellas, el modelo escribe libre
    const reply = await ask(used < o.maxSteps)
    const found = parseCalls(reply)
    // Sin llamadas, o sin poder hacer más: lo escrito es la respuesta. Vacía no se da por buena
    if (!found.length || used >= o.maxSteps) {
      const answer = visible(reply)
      if (answer) return answer
      throw new Error(found.length ? `The agent used its ${o.maxSteps} tool calls without writing an answer.` : 'The model returned an empty answer.')
    }
    messages.push({ role: 'assistant', content: reply })
    const results: string[] = []
    for (const call of found) {
      if (used >= o.maxSteps) {
        results.push('Error: no tool calls left for this answer.')
        continue
      }
      used++
      results.push(await run(call))
    }
    const last = used >= o.maxSteps
    messages.push({
      role: 'user',
      content: results.map(r => `<tool_response>\n${truncate(defuse(r))}\n</tool_response>`).join('\n')
        + (last ? '\n\nAnswer now with what you have. Do not call any more tools.' : ''),
    })
  }
}
