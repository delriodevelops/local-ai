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
  maxSteps: number
  temperature: number
  maxTokens: number
  signal: AbortSignal
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

function parseCall(reply: string): Parsed | null {
  const start = reply.indexOf(OPEN)
  if (start < 0) return null
  const end = reply.indexOf(CLOSE, start)
  const body = reply.slice(start + OPEN.length, end < 0 ? undefined : end).trim()
  try {
    const call = JSON.parse(body)
    if (typeof call?.name !== 'string') return { invalid: body }
    return { name: call.name, args: call.arguments ?? call.parameters ?? {} }
  } catch {
    return { invalid: body }
  }
}

// Lo que se enseña mientras escribe: el texto sin la llamada a medio escribir
const visible = (text: string) => text.split(OPEN)[0].replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim()

const truncate = (text: string) => (text.length > RESULT_LIMIT ? `${text.slice(0, RESULT_LIMIT)}\n[…cut, ${text.length - RESULT_LIMIT} more characters]` : text)

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

const isGrammarError = (error: unknown) => error instanceof Error && /grammar|structural/i.test(`${error.name} ${error.message}`)

export async function runAgent(o: AgentOptions) {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt(o.instructions, o.tools) },
    { role: 'user', content: o.input },
  ]
  const calls: ToolCall[] = []
  const seen = new Set<string>()
  // Si un esquema no se deja convertir en gramática, el agente sigue sin ella y se comprueba al recibir la llamada
  let format: ResponseFormat | undefined = toolFormat(o.tools)

  const ask = async (constrained: boolean) => {
    const options = {
      temperature: constrained ? 0 : o.temperature,
      maxTokens: o.maxTokens,
      signal: o.signal,
      onStart: o.onStart,
      onToken: (text: string) => o.onText(visible(text)),
      repetitionPenalty: 1,
    }
    if (constrained && format) {
      try {
        return await generate(messages, { ...options, responseFormat: format })
      } catch (error) {
        if (!isGrammarError(error)) throw error
        format = undefined
      }
    }
    return generate(messages, options)
  }

  for (let step = 0; step < o.maxSteps; step++) {
    const reply = await ask(true)
    const call = parseCall(reply)
    if (!call) return visible(reply)
    messages.push({ role: 'assistant', content: reply })

    let result: string
    if ('invalid' in call) {
      calls.push({ tool: '?', args: call.invalid, error: 'not valid JSON' })
      result = 'Error: the tool call was not valid JSON. Write it again exactly in the format shown.'
    } else {
      const entry: ToolCall = { tool: call.name, args: JSON.stringify(call.args) }
      calls.push(entry)
      o.onCalls([...calls])
      const target = o.tools.find(t => t.name === call.name)
      const key = `${call.name} ${entry.args}`
      const problem = target ? checkArguments(target.tool.inputSchema, call.args) : null
      if (!target) result = `Error: there is no tool called ${call.name}.`
      else if (seen.has(key)) result = 'Error: you already made this exact call. Use its result above.'
      else if (problem) result = `Error: invalid arguments. ${problem}`
      else {
        seen.add(key)
        o.onStatus(`Calling ${call.name}…`)
        try {
          const output = await callTool(target.server, target.tool.name, call.args, {
            signal: o.signal,
            onProgress: progress => o.onStatus(`${call.name} · ${progress}`),
          })
          result = output.text || (output.images.length ? '(the tool returned an image)' : '(empty result)')
          entry.result = firstLine(result, 200)
        } catch (error) {
          if (o.signal.aborted) throw error
          result = `Error: ${message(error)}`
        }
        o.onStatus(undefined)
      }
      if (result.startsWith('Error: ')) entry.error = result.slice(7)
    }
    o.onCalls([...calls])
    const last = step === o.maxSteps - 1
    messages.push({
      role: 'user',
      content: `<tool_response>\n${truncate(result)}\n</tool_response>${last ? '\n\nAnswer now with what you have. Do not call any more tools.' : ''}`,
    })
  }
  // Sin respuesta tras el máximo de llamadas: contesta con lo que tiene, ya sin poder llamar a nada
  return visible(await ask(false))
}
