import * as Popover from '@radix-ui/react-popover'
import * as Slider from '@radix-ui/react-slider'
import { SlidersHorizontal } from 'lucide-react'
import { useApp } from '@/flow/store'

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
  const { temperature, maxTokens, falKey, set } = useApp()
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
          <label className="flex flex-col gap-2 border-t border-neutral-800 pt-4">
            <span className="text-sm text-neutral-100">fal.ai key <span className="text-neutral-500">· only for video</span></span>
            <input
              type="password" value={falKey} onChange={e => set({ falKey: e.target.value.trim() })}
              placeholder="Not set" autoComplete="off"
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-xs outline-none focus:border-signal"
            />
            <span className="text-xs text-neutral-500">Stays in this browser. Video prompts are sent to fal.ai and billed to this key.</span>
          </label>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
