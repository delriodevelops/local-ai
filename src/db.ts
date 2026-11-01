import Dexie, { type EntityTable } from 'dexie'
import type { Conversation } from './flow/types'

// El historial puede crecer mucho: IndexedDB en lugar de localStorage
export const db = new Dexie('meshmind') as Dexie & { conversations: EntityTable<Conversation, 'id'> }

db.version(1).stores({ conversations: 'id, updatedAt' })
