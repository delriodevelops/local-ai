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
      <div className="flex justify-between">
        <span className="text-sm text-neutral-100">{label}</span>
        <span className="font-mono text-xs text-signal-ink">{format(value)}</span>
      </div>
      <Slider.Root value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="relative flex h-5 items-center select-none touch-none">
        <Slider.Track className="relative h-1 grow rounded-full bg-neutral-700">
          <Slider.Range className="absolute h-full rounded-full bg-signal" />
        </Slider.Track>
        <Slider.Thumb aria-label={label} className="block w-4 h-4 rounded-full bg-neutral-50 shadow hover:scale-110 duration-150" />
      </Slider.Root>
      <span className="text-xs text-neutral-500">{hint}</span>
    </div>
  )
}

export default function Settings() {
  const { temperature, maxTokens, falKey, theme, mcpServers, set } = useApp()
  return (
    <Popover.Root>
      <Popover.Trigger className="p-2.5 rounded-lg border border-ink bg-neutral-900 hover:bg-ink hover:text-paper text-neutral-300 duration-200" title="Settings">
        <SlidersHorizontal className="w-4 h-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-72 border-[1.5px] border-ink bg-neutral-900 p-4 flex flex-col gap-5 animate-rise">
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
              className="flex items-center gap-3 border-t border-neutral-800 pt-4 text-left group"
            >
              <Plug className="w-4 h-4 text-neutral-300" />
              <span className="flex-1">
                <span className="block text-sm text-neutral-100">MCP servers</span>
                <span className="block text-xs text-neutral-500">{mcpServers.length ? `${mcpServers.length} added` : 'Give your flows online tools'}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-100 duration-200" />
            </button>
          </Popover.Close>
          <label className="flex flex-col gap-2 border-t border-neutral-800 pt-4">
            <span className="text-sm text-neutral-100">fal.ai key <span className="text-neutral-500">· only for video</span></span>
            <input
              type="password" value={falKey} onChange={e => set({ falKey: e.target.value.trim() })}
              placeholder="Not set" autoComplete="off"
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-xs outline-none focus:border-signal"
            />
            <span className="text-xs text-neutral-500">Stays in this browser. Video prompts are sent to fal.ai and billed to this key.</span>
          </label>
          <div className="flex flex-col gap-2 border-t border-neutral-800 pt-4">
            <span id="theme-label" className="text-sm text-neutral-100">Theme</span>
            <div role="group" aria-labelledby="theme-label" className="grid grid-cols-3 rounded-lg border border-neutral-700 bg-neutral-950 p-0.5">
              {THEMES.map(t => (
                <button
                  key={t.id} type="button" aria-pressed={theme === t.id}
                  onClick={() => set({ theme: t.id })}
                  className={cn('flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs duration-200 ease-snap', theme === t.id ? 'bg-ink text-paper' : 'text-neutral-400 hover:text-neutral-100')}
                >
                  <t.icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {t.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-neutral-500">System follows your device's light or dark setting.</span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
