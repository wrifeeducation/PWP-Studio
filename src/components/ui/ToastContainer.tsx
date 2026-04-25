/**
 * WF-053 — Toast Container
 * Fixed bottom-right container, renders active toasts.
 * Uses Framer Motion AnimatePresence for enter/exit animations.
 */

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { subscribe, remove, type ToastItem } from '../../lib/toast'

const BORDER_COLOUR: Record<ToastItem['type'], string> = {
  success: '#16A34A',
  error: '#DC2626',
  info: '#2563EB',
}

const LABEL: Record<ToastItem['type'], string> = {
  success: 'Success',
  error: 'Error',
  info: 'Info',
}

function ToastCard({ toast }: { toast: ToastItem }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.22 }}
      role="alert"
      aria-live="polite"
      data-testid={`toast-${toast.id}`}
      className="flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg min-w-[240px] max-w-xs"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${BORDER_COLOUR[toast.type]}`,
      }}
    >
      <div className="flex-1">
        <p className="text-xs font-semibold mb-0.5" style={{ color: BORDER_COLOUR[toast.type] }}>
          {LABEL[toast.type]}
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text)' }}>
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => remove(toast.id)}
        aria-label="Dismiss"
        data-testid={`toast-dismiss-${toast.id}`}
        className="text-lg leading-none mt-0.5 flex-shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
      >
        ×
      </button>
    </motion.div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    return subscribe(setToasts)
  }, [])

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end no-print"
      data-testid="toast-container"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}
