import { memo, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useScheme } from '@/ui/theme'

// Shiki solo se descarga la primera vez que aparece un bloque de código.
// Los colores van en el HTML que genera, así que se vuelve a resaltar al cambiar de tema
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const theme = useScheme() === 'dark' ? 'vitesse-dark' : 'vitesse-light'
  useEffect(() => {
    let alive = true
    import('shiki/bundle/web')
      .then(({ codeToHtml, bundledLanguages }) =>
        codeToHtml(code, { lang: lang in bundledLanguages ? lang : 'text', theme }))
      .then(result => alive && setHtml(result))
      .catch(() => {})
    return () => { alive = false }
  }, [code, lang, theme])

  if (!html) return <pre><code>{code}</code></pre>
  return <div className="shiki-block" dangerouslySetInnerHTML={{ __html: html }} />
}

export const Markdown = memo(({ text }: { text: string }) => (
  <div className="prose max-w-none prose-p:leading-relaxed prose-headings:font-extrabold prose-headings:uppercase prose-headings:tracking-tight prose-strong:text-neutral-50 prose-a:text-signal-ink prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-li:marker:text-neutral-500 text-[15px] text-neutral-200">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Los enlaces salen en otra pestaña: en esta se perdería el modelo cargado, y en la demo de la landing,
        // el marco. Los que apuntan a la propia respuesta (notas al pie) se quedan aquí
        a: ({ href, children }) => (href?.startsWith('#')
          ? <a href={href}>{children}</a>
          : <a href={href} target="_blank" rel="noreferrer">{children}</a>),
        // Una imagen de otro sitio se cargaría sola y su dirección puede llevar datos de la conversación
        // (lo que devuelve una herramienta MCP, o lo que un agente copie de ella): se enseña como enlace
        img: ({ src, alt }) => (typeof src === 'string' && src.startsWith('data:')
          ? <img src={src} alt={alt ?? ''} />
          : <a href={typeof src === 'string' ? src : undefined} target="_blank" rel="noreferrer">{alt || 'Image'}</a>),
        pre: ({ children }) => <>{children}</>,
        code: ({ className, children }) => {
          const lang = /language-(\w+)/.exec(className ?? '')?.[1]
          const code = String(children).replace(/\n$/, '')
          return lang || code.includes('\n')
            ? <CodeBlock code={code} lang={lang ?? 'text'} />
            : <code className="rounded bg-neutral-800 px-1 py-0.5 text-[0.9em]">{children}</code>
        },
      }}
    >
      {text}
    </ReactMarkdown>
  </div>
))
