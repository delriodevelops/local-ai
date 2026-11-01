import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ChevronDown, Cpu, Search, X, HardDriveDownload } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useEngine } from '@/engine/engine'
import { isCached, loadModels, type ModelInfo } from '@/engine/models'
import { useApp } from '@/flow/store'
import { rateModel, useDevice } from '@/engine/device'

export default function ModelPicker() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cached, setCached] = useState<Set<string>>(new Set())
  const [models, setModels] = useState<ModelInfo[]>([])
  const { status, modelId, progress, progressText, load } = useEngine()
  const setApp = useApp(s => s.set)
  const { profile, refresh } = useDevice()

  // Marca los modelos ya descargados: abrirlos es instantáneo
  useEffect(() => {
    if (!open) return
    refresh()
    loadModels().then(async list => {
      setModels(list)
      const ids = await Promise.all(list.map(async m => ((await isCached(m.id)) ? m.id : null)))
      setCached(new Set(ids.filter((id): id is string => !!id)))
    })
  }, [open])

  const list = useMemo(() => {
    const q = query.toLowerCase()
    return models.filter(m => m.id.toLowerCase().includes(q))
  }, [query, models])

  const pick = (id: string) => {
    setApp({ modelId: id })
    load(id)
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="relative overflow-hidden flex items-center gap-2 min-w-0 max-w-full sm:w-80 rounded-lg border border-ink hover:bg-ink hover:text-paper bg-neutral-900 px-3 py-2 duration-300 ease-snap"
        >
          <Cpu className="w-4 h-4 shrink-0 text-neutral-400" />
          <span className="label hidden sm:inline">Model</span>
          <span className={cn('truncate font-mono text-[12.5px]', modelId ? 'text-neutral-100' : 'text-neutral-400')}>
            {modelId ?? 'Select a model'}
          </span>
          <ChevronDown className="w-4 h-4 ml-auto shrink-0 text-neutral-500" />
          {status === 'loading' && (
            <span className="absolute left-0 bottom-0 h-0.5 bg-signal duration-300" style={{ width: `${Math.max(3, progress * 100)}%` }} />
          )}
        </button>
      </Dialog.Trigger>
      {status === 'loading' && (
        <span className="hidden lg:block font-mono text-[11px] text-signal-ink truncate max-w-72" title={progressText}>{progressText}</span>
      )}

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed z-50 inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[32rem] max-h-[85dvh] flex flex-col border-[1.5px] border-ink bg-neutral-900 animate-rise">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <Dialog.Title className="display text-3xl">Choose a model</Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"><X className="w-4 h-4" /></Dialog.Close>
          </div>
          <Dialog.Description className="px-5 text-sm text-neutral-400">
            It downloads once and stays in your browser. Small models (1–2 GB) are quick; bigger ones answer better.
          </Dialog.Description>
          {profile && (
            <p className="mx-5 mt-3 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-[10.5px] leading-relaxed text-neutral-400">
              {profile.gpu} · fp16 {profile.fp16 ? 'yes' : 'no'} · {profile.cores} cores{profile.ramGB ? ` · ~${profile.ramGB} GB RAM` : ''} · {Math.max(0, profile.quotaGB - profile.usedGB).toFixed(1)} GB free for models
            </p>
          )}
          <label className="mx-5 mt-4 mb-2 flex items-center gap-2 rounded-lg border border-neutral-700 focus-within:border-signal bg-neutral-950 px-3">
            <Search className="w-4 h-4 text-neutral-500" />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search models" className="flex-1 bg-transparent py-2 text-sm outline-none" />
          </label>
          <ul className="flex-1 overflow-y-auto px-2 pb-3">
            {!models.length && <li className="px-3 py-6 text-center label">Loading models…</li>}
            {list.map(model => {
              const fit = rateModel(model, profile, cached.has(model.id))
              return (
              <li key={model.id}>
                <button
                  type="button"
                  onClick={() => pick(model.id)}
                  className={cn('w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-neutral-800 duration-150', model.id === modelId && 'bg-neutral-800')}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-mono text-[12.5px] text-neutral-100">{model.id}</span>
                    <span className="flex gap-3 font-mono text-[10.5px] text-neutral-500">
                      <span>{model.sizeGB.toFixed(1)} GB</span>
                      {model.recommended && <span className="text-signal-ink">recommended</span>}
                      {cached.has(model.id) && <span className="flex items-center gap-1 text-blue-700"><HardDriveDownload className="w-3 h-3" />downloaded</span>}
                    </span>
                  </span>
                  <span
                    title={fit.reason}
                    className={cn('shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px]', {
                      'bg-neutral-800 text-neutral-50': fit.level === 'good',
                      'bg-amber-400/10 text-amber-800': fit.level === 'tight',
                      'bg-red-400/10 text-red-700': fit.level === 'no',
                    })}
                  >
                    {fit.level === 'good' ? 'fits' : fit.level === 'tight' ? 'tight' : "won't fit"}
                  </span>
                </button>
              </li>
              )
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
