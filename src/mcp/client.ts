import {
  Client, SdkError, SdkErrorCode, SdkHttpError, SSEClientTransport, StreamableHTTPClientTransport, UnauthorizedError,
  type CallToolResult,
} from '@modelcontextprotocol/client'
import { Validator, type Schema } from '@cfworker/json-schema'
import type { JsonSchema, McpOutput, McpServer, McpTool } from './types'

// El SDK de MCP pesa ~90 kB: este módulo solo se descarga al conectar un servidor o ejecutar un nodo MCP

const INFO = { name: 'MeshMind', version: '1.0.0' }
const CONNECT_TIMEOUT = 20_000

// Una conexión abierta por servidor; si cambian la dirección o el token, se abre otra
const connections = new Map<string, { key: string; client: Promise<Client> }>()

async function open(server: McpServer) {
  const url = new URL(server.url)
  const authProvider = server.token ? { token: async () => server.token } : undefined
  // 'auto' habla la versión 2026 con los servidores que la tienen y la de 2025 con el resto
  const client = new Client(INFO, { versionNegotiation: { mode: 'auto', probe: { timeoutMs: 15_000 } } })
  try {
    await client.connect(new StreamableHTTPClientTransport(url, { authProvider }), { timeout: CONNECT_TIMEOUT })
    return client
  } catch (error) {
    // Los servidores antiguos solo hablan SSE (su dirección suele acabar en /sse): se prueba con un cliente nuevo.
    // Si el fallo es de red o de CORS no: volvería a fallar igual
    const legacy = url.pathname.endsWith('/sse') || (error instanceof SdkHttpError && [400, 404, 405].includes(error.data.status))
    if (!legacy) throw error
    const fallback = new Client(INFO)
    await fallback.connect(new SSEClientTransport(url, { authProvider }), { timeout: CONNECT_TIMEOUT })
    return fallback
  }
}

function connect(server: McpServer) {
  const key = `${server.url}\n${server.token}`
  const current = connections.get(server.id)
  if (current?.key === key) return current.client
  current?.client.then(c => c.close()).catch(() => {})
  const client = open(server)
  connections.set(server.id, { key, client })
  // Si no conecta, el siguiente intento empieza de cero
  client.catch(() => { if (connections.get(server.id)?.client === client) connections.delete(server.id) })
  return client
}

export function disconnect(serverId: string) {
  connections.get(serverId)?.client.then(c => c.close()).catch(() => {})
  connections.delete(serverId)
}

// Una sesión de 2025 que el servidor ya olvidó responde 404: se vuelve a conectar una vez y se repite
async function withClient<T>(server: McpServer, job: (client: Client) => Promise<T>) {
  try {
    return await job(await connect(server))
  } catch (error) {
    if (!(error instanceof SdkHttpError && error.data.status === 404)) throw error
    disconnect(server.id)
    return job(await connect(server))
  }
}

export async function listTools(server: McpServer): Promise<McpTool[]> {
  // Sin cursor, el SDK recorre todas las páginas
  const { tools } = await withClient(server, client => client.listTools())
  return tools.map(t => ({ name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema as JsonSchema }))
}

// Comprueba los argumentos contra el esquema de la herramienta; devuelve el primer problema en palabras, o null
export function checkArguments(schema: JsonSchema | undefined, args: Record<string, unknown>) {
  if (!schema) return null
  const result = new Validator(schema as Schema, '2020-12', false).validate(args)
  if (result.valid) return null
  const missing = result.errors.find(e => e.keyword === 'required')
  if (missing) return missing.error
  const deepest = result.errors.at(-1)
  return deepest ? `${deepest.instanceLocation.replace(/^#\/?/, '') || 'arguments'}: ${deepest.error}` : 'Invalid arguments'
}

// Texto e imágenes de la respuesta; los enlaces a recursos van en el texto como enlaces de markdown
function toOutput(result: CallToolResult): McpOutput {
  const text: string[] = []
  const images: string[] = []
  for (const block of result.content ?? []) {
    if (block.type === 'text') text.push(block.text)
    else if (block.type === 'image') images.push(`data:${block.mimeType};base64,${block.data}`)
    else if (block.type === 'resource_link') text.push(`[${block.title ?? block.name}](${block.uri})`)
    else if (block.type === 'resource' && 'text' in block.resource) text.push(block.resource.text)
  }
  if (!text.length && result.structuredContent !== undefined) text.push(JSON.stringify(result.structuredContent, null, 2))
  const joined = text.join('\n\n').trim()
  // Un error de la herramienta llega como respuesta normal con isError: su texto explica qué pasó
  if (result.isError) throw new Error(joined || 'The tool reported an error.')
  return { text: joined, images }
}

export type CallOptions = {
  signal: AbortSignal
  onProgress?: (text: string) => void
}

export function callTool(server: McpServer, name: string, args: Record<string, unknown>, { signal, onProgress }: CallOptions) {
  return withClient(server, async client => toOutput(await client.callTool({ name, arguments: args }, {
    signal,
    // Un minuto sin noticias; las herramientas que avisan de su progreso pueden durar hasta cinco
    timeout: 60_000,
    resetTimeoutOnProgress: true,
    maxTotalTimeout: 300_000,
    onprogress: ({ progress, total, message }) => onProgress?.(message ?? (total ? `${Math.round((progress / total) * 100)}%` : `${progress}…`)),
  })))
}

const LOCAL = ['localhost', '127.0.0.1', '[::1]']

// Por qué no se pudo conectar, en palabras, y qué hacer
export function explain(error: unknown, address: string): { message: string; hint?: string } {
  let url: URL
  try { url = new URL(address) } catch { return { message: 'That address is not a valid URL.' } }
  const local = LOCAL.includes(url.hostname)
  if (location.protocol === 'https:' && url.protocol === 'http:' && !local) {
    return { message: 'Browsers block http:// servers from an https:// page.', hint: 'Use the https:// address of the server.' }
  }
  if (error instanceof UnauthorizedError || (error instanceof SdkHttpError && error.data.status === 401)) {
    return { message: 'This server needs a token.', hint: 'Paste an API key or access token in its token field. Servers that only offer a sign-in page are not supported yet.' }
  }
  if (error instanceof SdkHttpError) {
    const { status } = error.data
    if (status === 403) return { message: 'The server refused this site (HTTP 403).', hint: 'It may only accept some websites, or need a token.' }
    if (status === 404 || status === 405) return { message: `There is no MCP endpoint at this address (HTTP ${status}).`, hint: 'Check the path: it usually ends in /mcp or /sse.' }
    return { message: `The server answered with HTTP ${status}.` }
  }
  if (error instanceof SdkError && error.code === SdkErrorCode.RequestTimeout) return { message: 'The server did not answer in time.' }
  // fetch rechaza con TypeError tanto si no hay red como si el servidor no permite CORS: el navegador no deja distinguirlo
  if (error instanceof TypeError) {
    return local
      ? { message: 'Could not reach the local server.', hint: 'Start the bridge and let this site through its CORS setting (see the local servers guide).' }
      : { message: 'This server does not accept connections from websites, or it is offline.', hint: 'It has to allow browser apps (CORS). A local bridge can relay it.' }
  }
  return { message: error instanceof Error ? error.message : String(error) }
}
