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
import ModelPicker from '@/ui/ModelPicker'
import Settings from '@/ui/Settings'
import Monitor from '@/ui/Monitor'
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
  // En móvil no caben chat y lienzo a la vez
  const shown: View = !desktop && view === 'split' ? 'chat' : view

  // Si el último modelo usado ya está descargado, se carga solo; incrustada no, que pasar por la landing no ocupe la GPU
  useEffect(() => {
    if (!EMBED && modelId && hasWebGPU()) isCached(modelId).then(cached => { if (cached) load(modelId) })
  }, [])

  // Desde la landing se llega con ?template=…: se abre esa plantilla y se limpia la URL.
  // La demo incrustada la conserva: no guarda nada, así que al recargar el marco vuelve a necesitarla
  useEffect(() => {
    const url = new URL(window.location.href)
    const template = url.searchParams.get('template')
    if (!template || !TEMPLATES.some(t => t.id === template)) return
    useApp.getState().loadTemplate(template)
    set({ view: desktop ? 'split' : 'flow' })
    if (EMBED) return
    url.searchParams.delete('template')
    window.history.replaceState(null, '', url)
  }, [])

  return (
    <div className="flex h-dvh overflow-hidden">
      {sidebar && (
        <>
          {!desktop && <div className="fixed inset-0 z-30 bg-black/60" onClick={() => setSidebar(false)} />}
          <div className={cn('h-full', !desktop && 'fixed z-40 inset-y-0 left-0 animate-rise')}>
            <Sidebar onClose={() => setSidebar(false)} />
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center gap-2 px-3 py-3 border-b-[1.5px] border-ink">
          {/* Incrustada no hay historial: en la landing no se enseñan ni se borran las conversaciones guardadas */}
          {!sidebar && !EMBED && (
            <button type="button" onClick={() => setSidebar(true)} title="Open sidebar" className="p-2.5 rounded-lg border border-ink bg-neutral-900 hover:bg-ink hover:text-paper text-neutral-300 duration-200">
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
          <ModelPicker />
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-lg border border-neutral-700 bg-neutral-900 p-0.5" role="tablist">
              {VIEWS.filter(v => desktop || !v.desktopOnly).map(v => (
                <button
                  key={v.id} type="button" role="tab" aria-selected={shown === v.id} title={v.label}
                  onClick={() => set({ view: v.id })}
                  className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs duration-200 ease-snap', shown === v.id ? 'bg-ink text-paper' : 'text-neutral-400 hover:text-neutral-100')}
                >
                  <v.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>
            <Monitor />
            <Settings />
          </div>
        </header>

        {!hasWebGPU() && (
          <p className="mx-3 mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-900">
            This browser has no WebGPU, so models can't run here. Use a recent Chrome or Edge on desktop.
          </p>
        )}

        <div className="flex-1 min-h-0 flex">
          {shown !== 'flow' && (
            <section className={cn('min-w-0 flex flex-col', shown === 'split' ? 'w-[44%] border-r border-neutral-800' : 'flex-1')}>
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
    </div>
  )
}
