import { ArrowUpRight } from 'lucide-react'
import { useApp } from '@/flow/store'
import { TEMPLATES } from '@/flow/presets'

const NODES = [[40, 150], [120, 60], [150, 190], [230, 110], [300, 200], [320, 50]]
const EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [1, 5], [2, 4]]

// El disco rojo de la landing con la malla dentro, como la que dibuja la película del hero al abrirse:
// cables de papel, nodos rojos con borde de papel y la señal que va de uno a otro
function Disc() {
  return (
    <svg viewBox="0 0 360 360" className="w-full h-auto" aria-hidden="true">
      <circle cx="180" cy="180" r="180" fill="#ff3a1f" />
      <g transform="translate(0 55)">
        {EDGES.map(([a, b], i) => (
          <g key={i}>
            <line x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} stroke="#f2f2ef" strokeOpacity="0.6" strokeWidth="1.5" />
            <line
              x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]}
              stroke="#f2f2ef" strokeWidth="3.5" className="mesh-trace" style={{ animationDelay: `${i * 0.4}s` }}
            />
          </g>
        ))}
        {NODES.map(([x, y], i) => (
          <rect key={i} x={x - 7} y={y - 7} width="14" height="14" fill="#ff3a1f" stroke="#f2f2ef" strokeWidth="1.5" />
        ))}
      </g>
    </svg>
  )
}

export default function Welcome() {
  const loadTemplate = useApp(s => s.loadTemplate)
  const setApp = useApp(s => s.set)

  return (
    <div className="py-2">
      {/* El cartel del hero: retícula de doce columnas, titular enorme y el disco rojo detrás */}
      <section className="relative isolate pb-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 grid grid-cols-12 gap-x-6">
          {Array.from({ length: 12 }, (_, i) => <span key={i} className="border-l border-hair last:border-r" />)}
        </div>
        <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 label animate-rise">
          <span>MeshMind · local inference</span>
          <span className="hidden @lg:inline">Text, image, sound, tools</span>
        </div>
        {/* Disco y titular comparten celda: el titular pasa por delante del disco, como MIND en el hero,
            y el párrafo empieza debajo de los dos */}
        <div className="grid mt-12 @lg:mt-16">
          <div className="[grid-area:1/1] -z-10 justify-self-end self-start w-[36%] max-w-[280px] -mt-[7%] animate-drop">
            <Disc />
          </div>
          <h1 className="[grid-area:1/1] self-start display text-neutral-50 text-[length:clamp(56px,15cqi,132px)] leading-[0.8] animate-rise">
            <span className="block">Think in</span>
            <span className="block pl-[12%]">meshes.</span>
          </h1>
        </div>
        <p className="mt-10 max-w-md text-[15px] leading-relaxed text-neutral-300 animate-rise" style={{ animationDelay: '120ms' }}>
          Wire AI models into a flow: run them in parallel, split work into items, route by conditions, see, paint, listen and speak. Every model runs in your browser, with no server and no API key; only the nodes marked online send data, and only where you choose.
        </p>
      </section>

      {/* Las plantillas, como la lista numerada de la landing */}
      <div className="flex items-baseline justify-between border-t-2 border-ink pt-3">
        <p className="label">Start from a template</p>
        <span className="font-mono text-[11px] text-neutral-500 tabular-nums">{String(TEMPLATES.length).padStart(2, '0')}</span>
      </div>
      <ul className="grid @lg:grid-cols-2 @lg:gap-x-10">
        {TEMPLATES.map((t, i) => (
          <li key={t.id} className="animate-rise" style={{ animationDelay: `${200 + i * 70}ms` }}>
            <button
              type="button"
              onClick={() => { loadTemplate(t.id); setApp({ view: window.innerWidth < 1024 ? 'flow' : 'split' }) }}
              className="group relative w-full h-full text-left grid grid-cols-[36px_minmax(0,1fr)] gap-2 py-5 pr-9 border-b border-rule"
            >
              <span className="text-[13px] pt-1.5 tabular-nums text-neutral-400 group-hover:text-signal-ink duration-300">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex flex-col gap-1">
                <span className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-neutral-50 duration-500 ease-snap group-hover:translate-x-3 group-hover:text-signal-ink">{t.name}</span>
                <span className="text-sm leading-snug text-neutral-400">{t.description}</span>
              </span>
              <ArrowUpRight className="absolute right-0 top-5 w-6 h-6 text-signal-ink opacity-0 -translate-x-3 translate-y-3 duration-500 ease-snap group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />
              {/* El subrayado rojo que se dibuja al pasar el ratón */}
              <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 bg-signal origin-left scale-x-0 duration-500 ease-snap group-hover:scale-x-100" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
