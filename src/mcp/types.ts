// Lo justo de JSON Schema para pintar y rellenar los argumentos de una herramienta
export type JsonSchema = {
  type?: string | string[]
  title?: string
  description?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  enum?: unknown[]
  default?: unknown
  items?: JsonSchema
}

export type McpTool = { name: string; title?: string; description?: string; inputSchema: JsonSchema }

// Un servidor MCP online. El token solo se guarda en este navegador y solo se envía a ese servidor
export type McpServer = {
  id: string
  label: string
  url: string
  token: string
  // La última lista de herramientas que dio: los nodos se pintan sin conectarse al abrir la app
  tools: McpTool[]
}

// Estado de la conexión con cada servidor, solo mientras la página está abierta
export type McpStatus =
  | { state: 'connecting' }
  | { state: 'ready' }
  | { state: 'error'; message: string; hint?: string }

// Lo que devuelve una herramienta, ya en lo que viaja por las conexiones del flujo
export type McpOutput = { text: string; images: string[] }

// Una herramienta que puede usar un agente, con el servidor que la sirve
export type ToolRef = { serverId: string; name: string }
