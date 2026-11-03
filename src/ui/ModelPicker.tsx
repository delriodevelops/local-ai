import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ChevronDown, Cpu, Search, X, HardDriveDownload } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useEngine } from '@/engine/engine'
import { isCached, loadModels, rankModels, type ModelInfo, type RankedModel } from '@/engine/models'
import { useApp } from '@/flow/store'
import { useDevice } from '@/engine/device'

// 2026-03 → Mar 2026
const monthOf = (released: string) => {
  const [year, month] = released.split('-').map(Number)
  return new Date(year, month - 1).toLocaleDateString('en', { month: 'short', year: 'numeric' })
}

export default function ModelPicker() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cached, setCached] = useState<Set<string>>(new Set())
  const [models, setModels] = useState<ModelInfo[]>([])
  const { status, modelId, progress, progressText, load } = useEngine()
  const setApp = useApp(s => s.set)
  const { profile, refresh } = useDevice()

  // Marca los modelos ya descargados: abrirlos es instantáneo. Llegan junto con la lista para que el orden no salte
  useEffect(() => {
    if (!open) return
    refresh()
    loadModels().then(async list => {
      const ids = await Promise.all(list.map(async m => ((await isCached(m.id)) ? m.id : null)))
      setCached(new Set(ids.filter((id): id is string => !!id)))
      setModels(list)
    })
  }, [open])

  // El orden depende del equipo: sin su perfil todavía no se sabe qué cabe
  const ranked = useMemo(() => (profile && models.length ? rankModels(models, profile, cached) : null), [models, profile, cached])
  const bestId = ranked && ranked.main[0]?.fit.level !== 'no' ? ranked.main[0].id : null

  const [main, others] = useMemo(() => {
    const q = query.toLowerCase()
    const matches = (m: RankedModel) => m.id.toLowerCase().includes(q)
    return [ranked?.main.filter(matches) ?? [], ranked?.others.filter(matches) ?? []]
  }, [query, ranked])

  const pick = (id: string) => {
    setApp({ modelId: id })
    load(id)
    setOpen(false)
  }

  const row = (model: RankedModel) => {
    const { fit } = model
    const current = model.id === modelId
    return (
      <li key={model.id} className="border-b border-line">
        <button
          type="button"
          onClick={() => pick(model.id)}
          aria-current={current || undefined}
          className="group relative w-full flex items-center gap-3 py-3 text-left hover:bg-neutral-800 duration-150"
        >
          {/* El modelo elegido lleva el cuadrado rojo de la señal */}
          {current && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-signal" aria-hidden="true" />}
          <span className={cn('flex-1 min-w-0 duration-300 ease-snap', current ? 'pl-4' : 'group-hover:pl-1.5')}>
            <span className={cn('block truncate font-mono text-[12.5px] text-neutral-100', current && 'font-medium text-neutral-50')}>{model.id}</span>
            <span className="flex flex-wrap gap-x-3 font-mono text-[10.5px] text-neutral-500">
              <span>{model.sizeGB.toFixed(1)} GB</span>
              <span>{monthOf(model.released)}</span>
              {model.id === bestId && <span className="text-signal-ink">best for this device</span>}
              {cached.has(model.id) && <span className="flex items-center gap-1 text-neutral-300"><HardDriveDownload className="w-3 h-3" />downloaded</span>}
            </span>
          </span>
          <span
            title={fit.reason}
            className={cn('shrink-0 border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]', {
              'border-line text-neutral-400': fit.level === 'good',
              'border-ink text-neutral-50': fit.level === 'tight',
              'border-signal text-signal-ink': fit.level === 'no',
            })}
          >
            {fit.level === 'good' ? 'fits' : fit.level === 'tight' ? 'tight' : "won't fit"}
          </span>
        </button>
      </li>
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 h-10 min-w-0 max-w-full sm:w-80 border-[1.5px] border-ink hover:bg-ink hover:text-paper px-3 duration-300 ease-snap"
        >
          <Cpu className="w-4 h-4 shrink-0 text-neutral-400" />
          <span className="label hidden sm:inline">Model</span>
          <span className={cn('truncate font-mono text-[12.5px]', modelId ? 'text-neutral-100' : 'text-neutral-400')}>
            {modelId ?? 'Select a model'}
          </span>
          {/* La descarga avanza en la barra roja de arriba; aquí, cuánto lleva */}
          {status === 'loading' && <span className="shrink-0 font-mono text-[11px] text-signal-ink tabular-nums">{Math.round(progress * 100)}%</span>}
          <ChevronDown className="w-4 h-4 ml-auto shrink-0 text-neutral-500" />
        </button>
      </Dialog.Trigger>
      {status === 'loading' && (
        <span className="hidden 2xl:block font-mono text-[11px] text-signal-ink truncate max-w-72" title={progressText}>{progressText}</span>
      )}

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed z-50 inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[34rem] max-h-[85dvh] flex flex-col border-2 border-ink bg-paper animate-rise">
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <Dialog.Title className="display text-[40px] text-neutral-50">Choose a model</Dialog.Title>
            <Dialog.Close className="w-9 h-9 shrink-0 flex items-center justify-center text-neutral-400 hover:bg-ink hover:text-paper duration-200"><X className="w-4 h-4" /></Dialog.Close>
          </div>
          <Dialog.Description className="px-6 text-[15px] leading-relaxed text-neutral-300">
            The newest, smartest models that fit this device come first. Each one downloads once and stays in your browser.
          </Dialog.Description>
          {profile && (
            <p className="mx-6 mt-4 border-y border-line py-2 font-mono text-[10.5px] leading-relaxed text-neutral-400">
              {profile.gpu} · fp16 {profile.fp16 ? 'yes' : 'no'} · {profile.cores} cores{profile.ramGB ? ` · ~${profile.ramGB} GB RAM` : ''} · {Math.max(0, profile.quotaGB - profile.usedGB).toFixed(1)} GB free for models
            </p>
          )}
          <label className="mx-6 mt-5 flex items-center gap-2 border-b-2 border-ink focus-within:border-signal duration-200">
            <Search className="w-4 h-4 text-neutral-500" />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search models" className="flex-1 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-neutral-500" />
          </label>
          <ul className="flex-1 overflow-y-auto px-6 pb-4">
            {!ranked && <li className="py-6 text-center label">Loading models…</li>}
            {main.map(row)}
            {/* La misma familia en otra cuantización o con menos contexto: rara vez hace falta */}
            {others.length > 0 && <li className="pt-6 pb-2 label">Other versions</li>}
            {others.map(row)}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
