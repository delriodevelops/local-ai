import { useApp } from '@/flow/store'
import { TEMPLATES } from '@/flow/presets'

const NODES = [[40, 150], [120, 60], [150, 190], [230, 110], [300, 200], [320, 50]]
const EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [1, 5], [2, 4]]

// La señal recorre la malla de un nodo a otro
function Mesh() {
  return (
    <svg viewBox="0 0 360 250" className="w-full h-auto" aria-hidden="true">
      {EDGES.map(([a, b], i) => (
        <g key={i}>
          <line x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} stroke="#26281f" />
          <line
            x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]}
            stroke="#c8f560" strokeWidth="1.5" strokeLinecap="round" className="mesh-trace" style={{ animationDelay: `${i * 0.4}s` }}
          />
        </g>
      ))}
      {NODES.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="14" fill="#c8f560" opacity="0.08" className="mesh-node" style={{ animationDelay: `${i * 0.5}s` }} />
          <circle cx={x} cy={y} r="5" fill="#0b0c09" stroke="#c8f560" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  )
}

export default function Welcome() {
  const loadTemplate = useApp(s => s.loadTemplate)
  const setApp = useApp(s => s.set)

  return (
    <div className="py-6">
      <div className="grid gap-6 @xl:grid-cols-[1.2fr_0.8fr] items-center">
        <div className="flex flex-col gap-5 animate-rise">
          <span className="label">MeshMind · local inference</span>
          <h1 className="font-display text-5xl @md:text-6xl @2xl:text-7xl leading-[0.9] tracking-tight text-neutral-50">
            Think in <em className="text-signal">meshes.</em>
          </h1>
          <p className="text-neutral-400 max-w-md text-[15px] leading-relaxed">
            Wire AI assistants into a flow: run them in parallel, split work into items, route by conditions. It all runs in your browser. No server, no API key.
          </p>
        </div>
        <div className="hidden @xl:block animate-rise" style={{ animationDelay: '120ms' }}>
          <Mesh />
        </div>
      </div>
      <p className="label mt-10 mb-3">Start from a template</p>
      <ul className="grid @lg:grid-cols-2 border-t border-neutral-800">
        {TEMPLATES.map((t, i) => (
          <li key={t.id} className="border-b border-neutral-800 @lg:odd:border-r @lg:odd:pr-5 @lg:even:pl-5 animate-rise" style={{ animationDelay: `${200 + i * 70}ms` }}>
            <button
              type="button"
              onClick={() => { loadTemplate(t.id); setApp({ view: window.innerWidth < 1024 ? 'flow' : 'split' }) }}
              className="group w-full text-left py-4 flex gap-4"
            >
              <span className="font-mono text-xs text-lime-300 pt-0.5">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex flex-col gap-1">
                <span className="text-neutral-50 group-hover:text-signal duration-200">{t.name}</span>
                <span className="text-sm text-neutral-400">{t.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
