/**
 * WF-053 — Toast Notification System
 * Simple queue: toast.success(), toast.error(), toast.info()
 * Max 3 visible at once; auto-dismisses after 4 seconds.
 */

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  createdAt: number
}

type Listener = (toasts: ToastItem[]) => void

const MAX_TOASTS = 3
const AUTO_DISMISS_MS = 4000

let toasts: ToastItem[] = []
const listeners: Set<Listener> = new Set()

function notify() {
  listeners.forEach((l) => l([...toasts]))
}

function add(type: ToastType, message: string) {
  const item: ToastItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    message,
    createdAt: Date.now(),
  }

  toasts = [item, ...toasts].slice(0, MAX_TOASTS)
  notify()

  setTimeout(() => {
    remove(item.id)
  }, AUTO_DISMISS_MS)
}

export function remove(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  listener([...toasts])
  return () => listeners.delete(listener)
}

export const toast = {
  success: (message: string) => add('success', message),
  error: (message: string) => add('error', message),
  info: (message: string) => add('info', message),
}
