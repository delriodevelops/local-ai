import { create } from 'zustand'
import { db } from '@/db'
import { useApp } from '@/flow/store'
import { runFlow } from '@/flow/run'
import { validateFlow } from '@/flow/graph'
import { useEngine } from '@/engine/engine'
import type { Turn } from '@/flow/types'

type SessionState = {
  conversationId: string | null
  turns: Turn[]
  running: boolean
  error: string | null
  send: (input: string) => Promise<void>
  stop: () => void
  open: (id: string) => Promise<void>
  reset: () => void
}

let controller: AbortController | null = null

export const useSession = create<SessionState>((set, get) => ({
  conversationId: null,
  turns: [],
  running: false,
  error: null,

  async send(input) {
    const { nodes, edges, temperature, maxTokens } = useApp.getState()
    const problem = validateFlow(nodes, edges)
    if (problem) return set({ error: problem })
    if (useEngine.getState().status !== 'ready') return set({ error: 'Pick a model first.' })

    controller = new AbortController()
    const turn: Turn = {
      id: crypto.randomUUID(),
      input,
      steps: [],
      status: 'running',
      startedAt: Date.now(),
      modelId: useEngine.getState().modelId ?? '',
    }
    const update = (patch: Partial<Turn>) =>
      set(s => ({ turns: s.turns.map(t => (t.id === turn.id ? { ...t, ...patch } : t)) }))

    set(s => ({ turns: [...s.turns, turn], running: true, error: null }))

    let status: Turn['status'] = 'done'
    try {
      const steps = await runFlow({
        input, nodes, edges, temperature, maxTokens,
        signal: controller.signal,
        onUpdate: steps => update({ steps }),
      })
      if (controller.signal.aborted) status = 'stopped'
      else if (steps.some(s => s.state === 'error')) status = 'error'
      update({ steps, status })
    } catch (error) {
      update({ status: 'error' })
      set({ error: error instanceof Error ? error.message : String(error) })
    }
    set({ running: false })
    controller = null

    // Guarda la conversación entera en IndexedDB
    const now = Date.now()
    const id = get().conversationId ?? crypto.randomUUID()
    const existing = await db.conversations.get(id)
    await db.conversations.put({
      id,
      title: existing?.title ?? input.slice(0, 80),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      turns: get().turns,
    })
    set({ conversationId: id })
  },

  stop() {
    controller?.abort()
  },

  async open(id) {
    if (get().running) return
    const conversation = await db.conversations.get(id)
    if (conversation) set({ conversationId: id, turns: conversation.turns, error: null })
  },

  reset() {
    if (get().running) return
    set({ conversationId: null, turns: [], error: null })
  },
}))
