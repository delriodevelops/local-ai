import { useEffect } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Activity, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useDevice } from '@/engine/device'
import { useEngine } from '@/engine/engine'
import { MEDIA_INFO, useResources, type ModelState } from '@/engine/resources'
import { unloadModel } from '@/media/media'
import type { MediaModel } from '@/media/worker'

const STATE_STYLE: Record<ModelState, string> = {
  off: 'bg-neutral-600',
  loading: 'bg-amber-300 animate-pulse',
  ready: 'bg-ink',
  busy: 'bg-signal animate-pulse',
}

function Row({ name, device, state, detail, action }: { name: string; device: string; state: ModelState; detail?: string; action?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className={cn('w-2 h-2 shrink-0 rounded-full', STATE_STYLE[state])} />
      <span className="flex-1 min-w-0">
        <span className="block truncate text-sm text-neutral-100">{name}</span>
        <span className="block truncate font-mono text-[10.5px] text-neutral-500">{device} · {detail ?? state}</span>
      </span>
      {action}
    </li>
  )
}

// La caché es de todo el origen (en GitHub Pages, la comparten todos los proyectos de la cuenta): solo se tocan las de modelos
const MODEL_CACHES = /^(webllm\/(model|config|wasm)|transformers-cache|experimental_transformers-hash-cache|kokoro-voices)$/

// Qué corre dónde, a qué velocidad y cuánto ocupa: como el monitor de Strata, dentro de la página
export default function Monitor() {
  const { profile, refresh } = useDevice()
  const { status, modelId } = useEngine()
  const { media, tokensPerSecond, llmBusy } = useResources()
  const anyBusy = llmBusy || Object.values(media).some(m => m.state === 'busy' || m.state === 'loading')

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
      <Popover.Trigger className="relative p-2.5 rounded-lg border border-ink bg-neutral-900 hover:bg-ink hover:text-paper text-neutral-300 duration-200" title="Resources">
        <Activity className="w-4 h-4" />
        {anyBusy && <span className="absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full bg-signal animate-pulse" />}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-80 border-[1.5px] border-ink bg-neutral-900 p-4 animate-rise">
          <p className="label">This device</p>
          {profile && (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px]">
              <dt className="text-neutral-500">GPU</dt><dd className="truncate text-neutral-200">{profile.gpu}{profile.fp16 ? ' · fp16' : ''}</dd>
              <dt className="text-neutral-500">CPU</dt>
              <dd className={profile.isolated ? 'text-neutral-200' : 'text-amber-800'}>
                {profile.cores} threads · {profile.isolated ? 'multi-threaded' : 'single thread (reload the page)'}
              </dd>
              {profile.ramGB && <><dt className="text-neutral-500">RAM</dt><dd className="text-neutral-200">~{profile.ramGB} GB</dd></>}
              <dt className="text-neutral-500">Models</dt>
              <dd className="text-neutral-200">{profile.usedGB.toFixed(1)} of {profile.quotaGB.toFixed(0)} GB used</dd>
            </dl>
          )}

          <p className="label mt-5">Models</p>
          <ul className="mt-1 divide-y divide-neutral-800">
            <Row
              name={modelId ?? 'Text model'} device="GPU" state={llmState}
              detail={llmState === 'off' ? 'not loaded' : tokensPerSecond ? `${llmState} · ${tokensPerSecond.toFixed(0)} tokens/s` : llmState}
            />
            {(Object.keys(MEDIA_INFO) as MediaModel[]).map(model => (
              <Row
                key={model}
                name={MEDIA_INFO[model].name}
                device={MEDIA_INFO[model].device}
                state={media[model].state}
                detail={media[model].status ?? (media[model].state === 'off' ? `not loaded · ${MEDIA_INFO[model].sizeGB} GB` : media[model].state)}
                action={media[model].state === 'ready' && (
                  <button type="button" onClick={() => unloadModel(model)} className="rounded-md px-2 py-1 font-mono text-[10px] text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800">
                    free
                  </button>
                )}
              />
            ))}
          </ul>

          <button
            type="button" onClick={clearCache}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-300 hover:border-red-400/50 hover:text-red-700 duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete downloaded models
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
