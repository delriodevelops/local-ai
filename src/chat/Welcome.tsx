import { ArrowUpRight } from 'lucide-react'
import { useApp } from '@/flow/store'
import { TEMPLATES } from '@/flow/presets'

const NODES = [[40, 150], [120, 60], [150, 190], [230, 110], [300, 200], [320, 50]]
const EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [1, 5], [2, 4]]

// La señal recorre la malla de un nodo a otro: cables de tinta, pulsos rojos
function Mesh() {
  return (
    <svg viewBox="0 0 360 250" className="w-full h-auto" aria-hidden="true">
      {EDGES.map(([a, b], i) => (
        <g key={i}>
          <line x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} style={{ stroke: 'var(--color-ink)' }} strokeWidth="1.5" />
          <line
            x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]}
            stroke="#ff3a1f" strokeWidth="4" strokeLinecap="round" className="mesh-trace" style={{ animationDelay: `${i * 0.4}s` }}
          />
        </g>
      ))}
      {NODES.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="13" fill="#ff3a1f" opacity="0.15" className="mesh-node" style={{ animationDelay: `${i * 0.5}s` }} />
          <rect x={x - 6} y={y - 6} width="12" height="12" style={{ fill: 'var(--color-neutral-950)', stroke: 'var(--color-ink)' }} strokeWidth="2" />
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
      <div className="grid gap-6 @xl:grid-cols-[1.25fr_0.75fr] items-end">
        <div className="flex flex-col gap-5 animate-rise">
          <span className="label">MeshMind · local inference</span>
          <h1 className="display text-6xl @md:text-7xl @2xl:text-8xl leading-[0.82] text-neutral-50">
            Think in <span className="text-signal">meshes.</span>
          </h1>
          <p className="text-neutral-300 max-w-md text-[15px] leading-relaxed">
            Wire AI models into a flow: run them in parallel, split work into items, route by conditions, see, paint, listen and speak. Every model runs in your browser, with no server and no API key; only the nodes marked online send data, and only where you choose.
          </p>
        </div>
        <div className="hidden @xl:block animate-rise" style={{ animationDelay: '120ms' }}>
          <Mesh />
        </div>
      </div>
      <p className="label mt-12 mb-3">Start from a template</p>
      <ul className="grid @lg:grid-cols-2 @lg:gap-x-8 border-t-2 border-ink">
        {TEMPLATES.map((t, i) => (
          <li key={t.id} className="border-b border-ink animate-rise" style={{ animationDelay: `${200 + i * 70}ms` }}>
            <button
              type="button"
              onClick={() => { loadTemplate(t.id); setApp({ view: window.innerWidth < 1024 ? 'flow' : 'split' }) }}
              className="group relative w-full text-left py-4 pr-8 flex gap-4 duration-300 ease-snap hover:text-signal-ink"
            >
              <span className="text-xs pt-1 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex flex-col gap-1">
                <span className="text-lg font-bold tracking-tight duration-300 ease-snap group-hover:translate-x-2">{t.name}</span>
                <span className="text-sm text-neutral-400">{t.description}</span>
              </span>
              <ArrowUpRight className="absolute right-0 top-4 w-5 h-5 opacity-0 -translate-x-2 translate-y-2 duration-300 ease-snap group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
