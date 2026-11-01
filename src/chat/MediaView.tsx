import { Download } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Value } from '@/flow/types'

// Imagen, audio o vídeo de un paso o de una respuesta
export default function MediaView({ value, compact = false }: { value: Value; compact?: boolean }) {
  if (value.type === 'image') {
    return (
      <figure className="group relative w-fit">
        <img src={value.url} alt="" className={cn('rounded-lg border border-neutral-700 object-cover', compact ? 'max-h-28' : 'max-h-[28rem]')} />
        {!compact && (
          <a href={value.url} download="meshmind.png" title="Download" className="absolute right-2 top-2 rounded-md bg-neutral-950/80 p-1.5 text-neutral-200 opacity-0 group-hover:opacity-100 duration-200">
            <Download className="w-4 h-4" />
          </a>
        )}
      </figure>
    )
  }
  if (value.type === 'audio') return <audio controls src={value.url} className={cn('nodrag', compact ? 'w-full h-8' : 'w-full max-w-md')} />
  if (value.type === 'video') return <video controls src={value.url} className={cn('rounded-lg border border-neutral-700', compact ? 'max-h-28' : 'max-h-[28rem] w-full')} />
  return null
}
