import { cn } from '@/lib/cn'

// La firma de la cabecera de la landing: el nombre en negra y debajo qué es. Lleva a la landing
export default function Brand({ className }: { className?: string }) {
  return (
    <a href={import.meta.env.BASE_URL} title="About MeshMind" className={cn('group shrink-0 text-[15px] leading-[1.3] text-neutral-50', className)}>
      <span className="block font-extrabold tracking-[-0.01em] group-hover:text-signal-ink duration-300">MeshMind</span>
      <span className="block text-neutral-400">Local AI flows</span>
    </a>
  )
}
