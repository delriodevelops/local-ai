import type { JsonSchema, McpTool } from './types'

// Lo que llega al nodo se escribe en los argumentos con este marcador
export const INPUT = '{input}'

// El tipo de un campo sin contar null; en anyOf/oneOf, el de la primera rama que no sea null
function typeOf(schema?: JsonSchema): string | undefined {
  if (Array.isArray(schema?.type)) return schema.type.find(t => t !== 'null')
  if (schema?.type) return schema.type
  const branch = (schema?.anyOf ?? schema?.oneOf)?.find(s => s.type !== 'null')
  return branch && typeOf(branch)
}

export const toolFields = (tool?: McpTool) =>
  Object.entries(tool?.inputSchema.properties ?? {}).map(([name, schema]) => ({
    name,
    schema,
    type: typeOf(schema) ?? 'string',
    required: tool?.inputSchema.required?.includes(name) ?? false,
  }))

// Al elegir herramienta, el primer texto obligatorio recibe lo que llega al nodo
export function defaultArgs(tool: McpTool): Record<string, string> {
  const fields = toolFields(tool)
  const target = fields.find(f => f.required && f.type === 'string') ?? fields.find(f => f.type === 'string')
  return target ? { [target.name]: INPUT } : {}
}

// Convierte lo escrito en cada campo al tipo que pide el esquema. Dentro de un JSON, la entrada va escapada.
// Con el esquema a mano, solo se envían sus campos: uno que la herramienta ya no tiene no se ve en el nodo
export function toolArguments(tool: McpTool | undefined, values: Record<string, string>, input: string) {
  const args: Record<string, unknown> = {}
  const known = tool?.inputSchema.properties
  for (const [name, raw] of Object.entries(values)) {
    if (!raw.trim() || (known && !(name in known))) continue
    const type = typeOf(known?.[name]) ?? 'string'
    const json = type === 'object' || type === 'array'
    const replacement = json ? JSON.stringify(input).slice(1, -1) : input
    // Con una función, los $ del texto ($$, $&) se copian tal cual en lugar de leerse como patrones de reemplazo
    const value = raw.replaceAll(INPUT, () => replacement).trim()
    if (type === 'number' || type === 'integer') {
      const number = Number(value)
      if (Number.isNaN(number)) throw new Error(`${name} must be a number`)
      args[name] = number
    } else if (type === 'boolean') args[name] = /^(true|yes|1)$/i.test(value)
    else if (json) {
      try { args[name] = JSON.parse(value) } catch { throw new Error(`${name} must be valid JSON`) }
    } else args[name] = value
  }
  return args
}

export const firstLine = (text = '', max = 120) => {
  const line = text.trim().split('\n')[0]
  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}
