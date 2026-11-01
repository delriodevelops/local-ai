import type { McpServer } from './types'

// Servidores públicos que aceptan conexiones desde el navegador, para empezar con un clic.
// Sus ids son fijos: las plantillas los usan para saber qué servidor añadir
export const SUGGESTED: Omit<McpServer, 'token' | 'tools'>[] = [
  { id: 'deepwiki', label: 'DeepWiki', url: 'https://mcp.deepwiki.com/mcp' },
  { id: 'context7', label: 'Context7', url: 'https://mcp.context7.com/mcp' },
  { id: 'mslearn', label: 'Microsoft Learn', url: 'https://learn.microsoft.com/api/mcp' },
  { id: 'huggingface', label: 'Hugging Face', url: 'https://huggingface.co/mcp' },
]
