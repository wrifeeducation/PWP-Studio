/**
 * WF-027: OfflineBanner
 * Fixed banner displayed at top of screen when the user is offline.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline-banner"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
          style={{
            backgroundColor: '#FEF3C7',
            borderBottom: '1px solid #FDE68A',
            color: '#92400E',
          }}
          role="status"
          aria-live="polite"
          data-testid="offline-banner"
          data-tts="You are offline — your work is being saved locally"
        >
          <span aria-hidden="true">⚠️</span>
          <span>You're offline — your work is being saved locally</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
