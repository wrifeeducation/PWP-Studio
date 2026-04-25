/**
 * WF-052 — Skeleton Loading Component
 * Animated shimmer skeleton with width, height, borderRadius props.
 */

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius = '0.5rem',
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        backgroundColor: 'var(--color-border)',
        overflow: 'hidden',
        position: 'relative',
      }}
      aria-hidden="true"
    />
  )
}
