import { lazy, Suspense, useEffect, useState } from 'react'
import { MessagesSquare, PanelLeft, Columns2, Workflow } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useMedia } from '@/lib/useMedia'
import { EMBED } from '@/embed'
import { useApp, type View } from '@/flow/store'
import { TEMPLATES } from '@/flow/presets'
import { useEngine } from '@/engine/engine'
import { hasWebGPU, isCached } from '@/engine/models'
import Sidebar from '@/ui/Sidebar'
import Brand from '@/ui/Brand'
import ModelPicker from '@/ui/ModelPicker'
import Settings from '@/ui/Settings'
import Monitor from '@/ui/Monitor'
import McpServers from '@/ui/McpServers'
import Thread from '@/chat/Thread'
import Composer from '@/chat/Composer'

// El lienzo (React Flow) solo se descarga cuando se abre
const Canvas = lazy(() => import('@/flow/Canvas'))

const VIEWS: { id: View; label: string; icon: typeof Workflow; desktopOnly?: boolean }[] = [
  { id: 'chat', label: 'Chat', icon: MessagesSquare },
  { id: 'split', label: 'Both', icon: Columns2, desktopOnly: true },
  { id: 'flow', label: 'Flow', icon: Workflow },
]

export default function App() {
  const desktop = useMedia('(min-width: 1024px)')
  const [sidebar, setSidebar] = useState(() => !EMBED && window.matchMedia('(min-width: 1440px)').matches)
  const { view, modelId, set } = useApp()
  const load = useEngine(s => s.load)
  // Mientras baja un modelo, la barra roja de arriba avanza, como la de progreso de la landing
  const loading = useEngine(s => (s.status === 'loading' ? s.progress : null))
  // En móvil no caben chat y lienzo a la vez
  const shown: View = !desktop && view === 'split' ? 'chat' : view
  const views = VIEWS.filter(v => desktop || !v.desktopOnly)

  // Si el último modelo usado ya está descargado, se carga solo; incrustada no, que pasar por la landing no ocupe la GPU
  useEffect(() => {
    if (!EMBED && modelId && hasWebGPU()) isCached(modelId).then(cached => { if (cached) load(modelId) })
  }, [])

  // Desde la landing se llega con ?template=…: se abre esa plantilla y se limpia la URL.
  // La demo incrustada la conserva: no guarda nada, así que al recargar el marco vuelve a necesitarla
  useEffect(() => {
    const url = new URL(window.location.href)
    const template = url.searchParams.get('template')
    // La dirección de la demo abierta fuera de su marco (otra pestaña): es la app normal, y su plantilla
    // no debe sustituir el flujo guardado
    if (url.searchParams.has('embed') && !EMBED) {
      url.searchParams.delete('embed')
      url.searchParams.delete('template')
      window.history.replaceState(null, '', url)
      return
    }
    if (!template || !TEMPLATES.some(t => t.id === template)) return
    useApp.getState().loadTemplate(template)
    set({ view: desktop ? 'split' : 'flow' })
    if (EMBED) return
    url.searchParams.delete('template')
    window.history.replaceState(null, '', url)
  }, [])

  return (
    <div className="flex h-dvh overflow-hidden">
      {loading !== null && (
        <div
          aria-hidden="true"
          className="fixed inset-x-0 top-0 z-[60] h-1 bg-signal origin-left duration-300 ease-snap"
          style={{ transform: `scaleX(${Math.max(0.03, loading)})` }}
        />
      )}
      {sidebar && (
        <>
          {!desktop && <div className="fixed inset-0 z-30 bg-black/60" onClick={() => setSidebar(false)} />}
          <div className={cn('h-full', !desktop && 'fixed z-40 inset-y-0 left-0 animate-rise')}>
            <Sidebar onClose={() => setSidebar(false)} />
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-16 shrink-0 border-b-2 border-ink">
          {/* Incrustada no hay historial: en la landing no se enseñan ni se borran las conversaciones guardadas */}
          {!sidebar && !EMBED && (
            <button type="button" onClick={() => setSidebar(true)} title="Open sidebar" className="w-10 h-10 shrink-0 flex items-center justify-center border-[1.5px] border-ink hover:bg-ink hover:text-paper duration-200">
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
          {!sidebar && !EMBED && <Brand className="hidden xl:block mr-3" />}
          <ModelPicker />
          {/* Las vistas, como la navegación numerada de la landing: subrayado rojo en la elegida */}
          <div className="ml-auto flex items-center gap-4 sm:gap-6" role="tablist" aria-label="View">
            {views.map((v, i) => (
              <button
                key={v.id} type="button" role="tab" aria-selected={shown === v.id} title={v.label}
                onClick={() => set({ view: v.id })}
                className={cn('tab flex items-center gap-1.5 pt-1 pb-[5px] text-[13px] whitespace-nowrap', shown === v.id ? 'text-neutral-50' : 'text-neutral-400 hover:text-neutral-50')}
              >
                <v.icon className="w-4 h-4 sm:hidden" />
                <span className="hidden sm:inline tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:ml-2">
            <Monitor />
            <Settings />
          </div>
        </header>

        {!hasWebGPU() && (
          <p className="flex items-center gap-3 bg-ink px-4 py-2.5 text-[13px] text-paper">
            <span className="w-2 h-2 shrink-0 rounded-full bg-signal" aria-hidden="true" />
            This browser has no WebGPU, so models can't run here. Use a recent Chrome or Edge on desktop.
          </p>
        )}

        <div className="flex-1 min-h-0 flex">
          {shown !== 'flow' && (
            <section className={cn('min-w-0 flex flex-col', shown === 'split' ? 'w-[44%] border-r border-rule' : 'flex-1')}>
              <Thread />
              <Composer />
            </section>
          )}
          {shown !== 'chat' && (
            <section className="flex-1 min-w-0 flex flex-col">
              <Suspense fallback={<p className="m-auto label">Loading canvas…</p>}>
                <div className="flex-1 min-h-0"><Canvas key={shown} /></div>
              </Suspense>
              {shown === 'flow' && !desktop && <Composer />}
            </section>
          )}
        </div>
      </main>
      <McpServers />
    </div>
  )
}
