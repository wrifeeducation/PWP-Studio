/**
 * WF-027: Offline Queue
 * In-memory queue of OfflineQueueItem entries.
 * enqueue() adds to the queue; dequeue() removes the oldest; flush() attempts Supabase sync.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { OfflineQueueItem, OfflineQueueItemType } from '../types/index'

// ─── Queue state ──────────────────────────────────────────────────────────────

const queue: OfflineQueueItem[] = []

// ─── Public API ───────────────────────────────────────────────────────────────

export function enqueue(item: OfflineQueueItem): void {
  queue.push(item)
}

export function dequeue(): OfflineQueueItem | undefined {
  return queue.shift()
}

export function getQueueLength(): number {
  return queue.length
}

export function clearQueue(): void {
  queue.splice(0, queue.length)
}

/**
 * flush() iterates the queue and attempts to save each item to Supabase.
 * On success the queue is cleared; on failure items are retained and retryCount incremented.
 */
export async function flush(supabase: SupabaseClient): Promise<{ synced: number; failed: number }> {
  if (queue.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0
  const unsynced: OfflineQueueItem[] = []

  for (const item of [...queue]) {
    try {
      await saveItem(supabase, item)
      synced++
    } catch (err) {
      const updatedItem: OfflineQueueItem = {
        ...item,
        retryCount: item.retryCount + 1,
        lastError: err instanceof Error ? err.message : 'Unknown error',
      }
      if (updatedItem.retryCount < updatedItem.maxRetries) {
        unsynced.push(updatedItem)
      }
      failed++
    }
  }

  // Replace queue contents with only the unsynced items
  queue.splice(0, queue.length, ...unsynced)

  return { synced, failed }
}

// ─── Internal save dispatch ────────────────────────────────────────────────────

async function saveItem(supabase: SupabaseClient, item: OfflineQueueItem): Promise<void> {
  const type: OfflineQueueItemType = item.type

  if (type === 'formula_session') {
    const { error } = await supabase.from('formula_sessions').insert(item.data as never)
    if (error) throw new Error(error.message)
    return
  }

  if (type === 'paragraph_session') {
    const { error } = await supabase.from('paragraph_sessions').insert(item.data as never)
    if (error) throw new Error(error.message)
    return
  }

  if (type === 'writing_piece_update') {
    const { id, ...rest } = item.data as { id: string } & Record<string, unknown>
    const { error } = await supabase.from('writing_pieces').update(rest as never).eq('id', id)
    if (error) throw new Error(error.message)
    return
  }

  if (type === 'progress_update') {
    const { pupil_id, ...rest } = item.data as { pupil_id: string } & Record<string, unknown>
    const { error } = await supabase
      .from('pupil_progress')
      .update(rest as never)
      .eq('pupil_id', pupil_id)
    if (error) throw new Error(error.message)
    return
  }

  throw new Error(`Unknown offline queue item type: ${type}`)
}
