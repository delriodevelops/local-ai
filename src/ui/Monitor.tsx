import { useEffect } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Activity, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useDevice } from '@/engine/device'
import { useEngine } from '@/engine/engine'
import { MEDIA_INFO, useResources, type ModelState } from '@/engine/resources'
import { useApp } from '@/flow/store'
import { localModel, mediaInfo, unloadModel } from '@/media/media'
import { FLUX } from '@/media/catalog'
import type { MediaBackend, MediaModel } from '@/media/worker'

const BACKEND_LABEL: Record<MediaBackend, string> = { webgpu: 'GPU', wasm: 'CPU' }

// El tamaño del backend en uso; si el modelo puede ir en los dos y aún no ha cargado, el rango
function sizeOf(model: MediaModel, backend?: MediaBackend) {
  const size = mediaInfo(model).sizeGB
  if (typeof size === 'number') return `${size} GB`
  if (backend) return `${size[backend]} GB`
  const [min, max] = [Math.min(...Object.values(size)), Math.max(...Object.values(size))]
  return `${min.toFixed(1)}–${max.toFixed(1)} GB`
}

// Los estados como los bloques del planificador de la landing: hueco si está apagado, rayado mientras carga,
// tinta si está listo y rojo, latiendo, mientras trabaja
const STATE_STYLE: Record<ModelState, string> = {
  off: 'border border-neutral-600',
  loading: 'hatch',
  ready: 'bg-ink',
  busy: 'bg-signal animate-live',
}

function Row({ name, device, state, detail, action }: { name: string; device: string; state: ModelState; detail?: string; action?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={cn('w-2.5 h-2.5 shrink-0', STATE_STYLE[state])} />
      <span className="flex-1 min-w-0">
        <span className="block truncate text-sm font-medium text-neutral-100">{name}</span>
        <span className="block truncate font-mono text-[10.5px] text-neutral-500">{device} · {detail ?? state}</span>
      </span>
      {action}
    </li>
  )
}

// La caché es de todo el origen (en GitHub Pages, la comparten todos los proyectos de la cuenta): solo se tocan las de modelos
const MODEL_CACHES = /^(webllm\/(model|config|wasm)|transformers-cache|experimental_transformers-hash-cache|kokoro-voices|meshmind-flux)$/

// Qué corre dónde, a qué velocidad y cuánto ocupa: como el monitor de Strata, dentro de la página
export default function Monitor() {
  const { profile, refresh } = useDevice()
  const { status, modelId } = useEngine()
  const { media, flux, tokensPerSecond, llmBusy } = useResources()
  // Cambiar de modelo en Ajustes cambia el nombre de su fila
  useApp(s => s.localModels)
  const anyBusy = llmBusy || [...Object.values(media), flux].some(m => m.state === 'busy' || m.state === 'loading')

  useEffect(() => { refresh() }, [refresh])

  // Borra los modelos guardados en la caché del navegador; se vuelven a descargar si hacen falta
  const clearCache = async () => {
    if (!window.confirm('Delete every downloaded model from this browser? They will download again when needed.')) return
    for (const key of await caches.keys()) if (MODEL_CACHES.test(key)) await caches.delete(key)
    refresh()
  }

  const llmState: ModelState = status === 'loading' ? 'loading' : status !== 'ready' ? 'off' : llmBusy ? 'busy' : 'ready'

  return (
    <Popover.Root onOpenChange={open => open && refresh()}>
      <Popover.Trigger className="relative w-10 h-10 flex items-center justify-center border-[1.5px] border-ink hover:bg-ink hover:text-paper data-[state=open]:bg-ink data-[state=open]:text-paper duration-200" title="Resources">
        <Activity className="w-4 h-4" />
        {anyBusy && <span className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-signal animate-live" />}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={10} className="z-50 w-80 max-h-[calc(100dvh-88px)] overflow-y-auto border-2 border-ink bg-paper p-5 animate-rise">
          <p className="display text-[28px] text-neutral-50">Resources</p>
          {/* La velocidad del modelo de texto, en grande y estrecha como las cifras de la landing */}
          {llmState !== 'off' && !!tokensPerSecond && (
            <p className="mt-4 flex items-baseline gap-2 border-t-2 border-ink pt-3">
              <span className="numeral text-[56px] text-neutral-50">{tokensPerSecond.toFixed(0)}</span>
              <span className="label">tokens/s</span>
            </p>
          )}
          <p className="label mt-5 pb-2 border-b-2 border-ink">This device</p>
          {profile && (
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px]">
              <dt className="text-neutral-500">GPU</dt><dd className="truncate text-neutral-200">{profile.gpu}{profile.fp16 ? ' · fp16' : ''}</dd>
              <dt className="text-neutral-500">CPU</dt>
              <dd className={profile.isolated ? 'text-neutral-200' : 'text-signal-ink'}>
                {profile.cores} threads · {profile.isolated ? 'multi-threaded' : 'single thread (reload the page)'}
              </dd>
              {profile.ramGB && <><dt className="text-neutral-500">RAM</dt><dd className="text-neutral-200">~{profile.ramGB} GB</dd></>}
              <dt className="text-neutral-500">Models</dt>
              <dd className="text-neutral-200">{profile.usedGB.toFixed(1)} of {profile.quotaGB.toFixed(0)} GB used</dd>
            </dl>
          )}

          <p className="label mt-6 pb-2 border-b-2 border-ink">Models</p>
          <ul className="divide-y divide-line">
            <Row
              name={modelId ?? 'Text model'} device="GPU" state={llmState}
              detail={llmState === 'off' ? 'not loaded' : tokensPerSecond ? `${llmState} · ${tokensPerSecond.toFixed(0)} tokens/s` : llmState}
            />
            {(Object.keys(MEDIA_INFO) as MediaModel[]).map(model => (
              <Row
                key={model}
                name={mediaInfo(model).name}
                device={media[model].backend ? BACKEND_LABEL[media[model].backend] : MEDIA_INFO[model].device}
                state={media[model].state}
                detail={media[model].status ?? (media[model].state === 'off'
                  ? `not loaded · ${sizeOf(model)}`
                  : typeof MEDIA_INFO[model].sizeGB === 'number' ? media[model].state : `${media[model].state} · ${sizeOf(model, media[model].backend)}`)}
                action={media[model].state === 'ready' && (
                  <button type="button" onClick={() => unloadModel(model)} className="border border-line px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-400 hover:border-ink hover:bg-ink hover:text-paper duration-200">
                    free
                  </button>
                )}
              />
            ))}
            {/* FLUX.2 klein solo ocupa la gráfica mientras pinta: sin botón para soltarlo */}
            {(localModel('imagine').id === FLUX || flux.state !== 'off') && (
              <Row
                name="FLUX.2 klein 4B" device="GPU" state={flux.state}
                detail={flux.status ?? (flux.state === 'off' ? 'loads while painting · 6.5 GB' : flux.state)}
              />
            )}
          </ul>

          <button
            type="button" onClick={clearCache}
            className="mt-5 w-full flex items-center justify-center gap-2 border-[1.5px] border-line px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-300 hover:border-signal hover:text-signal-ink duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete downloaded models
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
