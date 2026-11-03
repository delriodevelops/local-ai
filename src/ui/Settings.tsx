import * as Popover from '@radix-ui/react-popover'
import * as Slider from '@radix-ui/react-slider'
import { ChevronRight, Monitor, Moon, Plug, SlidersHorizontal, Sun } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp, type Theme } from '@/flow/store'
import { useMcp } from '@/mcp/store'

const THEMES: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
]

function Range({ label, hint, value, min, max, step, onChange, format }: {
  label: string; hint: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="label text-neutral-50">{label}</span>
        <span className="font-mono text-xs text-neutral-50 tabular-nums">{format(value)}</span>
      </div>
      {/* Una regla de tinta por la que corre el disco rojo de la landing */}
      <Slider.Root value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="relative flex h-5 items-center select-none touch-none">
        <Slider.Track className="relative h-px grow bg-neutral-600">
          <Slider.Range className="absolute -top-px h-[3px] bg-ink" />
        </Slider.Track>
        <Slider.Thumb aria-label={label} className="block w-4 h-4 rounded-full bg-signal hover:scale-125 duration-200 ease-snap" />
      </Slider.Root>
      <span className="text-xs leading-relaxed text-neutral-500">{hint}</span>
    </div>
  )
}

export default function Settings() {
  const { temperature, maxTokens, falKey, theme, mcpServers, set } = useApp()
  return (
    <Popover.Root>
      <Popover.Trigger className="w-10 h-10 flex items-center justify-center border-[1.5px] border-ink hover:bg-ink hover:text-paper data-[state=open]:bg-ink data-[state=open]:text-paper duration-200" title="Settings">
        <SlidersHorizontal className="w-4 h-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={10} className="z-50 w-80 max-h-[calc(100dvh-88px)] overflow-y-auto border-2 border-ink bg-paper p-5 flex flex-col gap-5 animate-rise">
          <p className="display text-[28px] text-neutral-50">Settings</p>
          <Range
            label="Creativity" hint="Low: precise and repeatable. High: varied and looser."
            value={temperature} min={0} max={1.5} step={0.1} format={v => v.toFixed(1)}
            onChange={v => set({ temperature: v })}
          />
          <Range
            label="Answer length" hint="Maximum length of each assistant's answer."
            value={maxTokens} min={128} max={2048} step={64} format={v => `${v} tokens`}
            onChange={v => set({ maxTokens: v })}
          />
          {/* La ventana vive fuera del popover: si estuviera dentro, se cerraría con él */}
          <Popover.Close asChild>
            <button
              type="button" onClick={() => useMcp.setState({ open: true })}
              className="flex items-center gap-3 border-t border-line pt-4 text-left group"
            >
              <Plug className="w-4 h-4 text-neutral-300 group-hover:text-signal-ink duration-200" />
              <span className="flex-1">
                <span className="label block text-neutral-50 group-hover:text-signal-ink duration-200">MCP servers</span>
                <span className="block mt-0.5 text-xs text-neutral-500">{mcpServers.length ? `${mcpServers.length} added` : 'Give your flows online tools'}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-signal-ink group-hover:translate-x-1 duration-300 ease-snap" />
            </button>
          </Popover.Close>
          <label className="flex flex-col gap-2 border-t border-line pt-4">
            <span className="label text-neutral-50">fal.ai key <span className="text-neutral-500">· only for video</span></span>
            <input
              type="password" value={falKey} onChange={e => set({ falKey: e.target.value.trim() })}
              placeholder="Not set" autoComplete="off"
              className="border border-line bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-signal placeholder:text-neutral-500"
            />
            <span className="text-xs leading-relaxed text-neutral-500">Stays in this browser. Video prompts are sent to fal.ai and billed to this key.</span>
          </label>
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <span id="theme-label" className="label text-neutral-50">Theme</span>
            <div role="group" aria-labelledby="theme-label" className="grid grid-cols-3 border-[1.5px] border-ink">
              {THEMES.map(t => (
                <button
                  key={t.id} type="button" aria-pressed={theme === t.id}
                  onClick={() => set({ theme: t.id })}
                  className={cn('flex items-center justify-center gap-1.5 px-2 py-2 text-xs duration-200 ease-snap not-last:border-r-[1.5px] not-last:border-ink', theme === t.id ? 'bg-ink text-paper' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-50')}
                >
                  <t.icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {t.label}
                </button>
              ))}
            </div>
            <span className="text-xs leading-relaxed text-neutral-500">System follows your device's light or dark setting.</span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
