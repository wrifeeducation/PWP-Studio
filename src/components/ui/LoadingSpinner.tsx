/**
 * WF-040: LoadingSpinner — CSS-only animated spinner for Suspense fallbacks.
 * Uses CSS animation only (no library), colour from var(--color-brand-primary).
 */

interface LoadingSpinnerProps {
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading…',
  size = 'md',
}) => {
  const sizes = { sm: 24, md: 40, lg: 56 }
  const borderWidths = { sm: 3, md: 4, lg: 5 }
  const px = sizes[size]
  const bw = borderWidths[size]

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ minHeight: '160px', gap: '12px' }}
      role="status"
      aria-live="polite"
      aria-label={label}
      data-testid="loading-spinner"
    >
      <div
        style={{
          width: px,
          height: px,
          borderWidth: bw,
          borderStyle: 'solid',
          borderColor: 'var(--color-border)',
          borderTopColor: 'var(--color-brand-primary)',
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite',
        }}
      />
      <p
        className="text-sm font-medium"
        style={{ color: 'var(--color-text-muted)' }}
        data-tts={label}
      >
        {label}
      </p>

      {/* Inline keyframe — avoids need for global CSS entry */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
