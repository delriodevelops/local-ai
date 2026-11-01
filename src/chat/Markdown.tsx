import { memo, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Shiki solo se descarga la primera vez que aparece un bloque de código
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [html, setHtml] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    import('shiki/bundle/web')
      .then(({ codeToHtml, bundledLanguages }) =>
        codeToHtml(code, { lang: lang in bundledLanguages ? lang : 'text', theme: 'vitesse-dark' }))
      .then(result => alive && setHtml(result))
      .catch(() => {})
    return () => { alive = false }
  }, [code, lang])

  if (!html) return <pre><code>{code}</code></pre>
  return <div className="shiki-block" dangerouslySetInnerHTML={{ __html: html }} />
}

export const Markdown = memo(({ text }: { text: string }) => (
  <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-display prose-headings:font-normal prose-headings:tracking-tight prose-strong:text-neutral-50 prose-a:text-lime-300 prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-li:marker:text-neutral-500 text-[15px] text-neutral-200">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
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
