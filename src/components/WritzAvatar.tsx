/**
 * WritzAvatar — WriFe's pencil mascot with purchasable cosmetic variants.
 * Each variant is a fully inline SVG so there are no external asset dependencies.
 *
 * Variants:
 *   wizard    — purple wizard hat, yellow pencil  (free)
 *   royal     — blue pencil, gold crown           (🪙100)
 *   explorer  — gold pencil, cowboy hat           (🪙150)
 *   popstar   — pink pencil, sunglasses + stars   (🪙200)
 *   ninja     — dark pencil, headband             (🪙200)
 */

import React from 'react'

export type AvatarVariantId = 'wizard' | 'royal' | 'explorer' | 'popstar' | 'ninja'

interface WritzAvatarProps {
  variant?: AvatarVariantId
  size?: number
  className?: string
  /** Animate a gentle bob */
  animated?: boolean
}

// ─── shared pencil body ────────────────────────────────────────────────────
// The pencil is drawn in a 100×100 viewBox, tilted ~15° from vertical.
// Colour params let each variant customise the barrel, tip, and eraser.

interface PencilProps {
  barrelColour: string
  bandColour: string
  tipColour: string
  eraserColour: string
  /** Overlay element drawn on top of pencil (hat, crown, etc.) */
  accessory?: React.ReactNode
  /** Overlay face expression tweaks */
  faceExtra?: React.ReactNode
}

const PencilBody: React.FC<PencilProps> = ({
  barrelColour,
  bandColour,
  tipColour,
  eraserColour,
  accessory,
  faceExtra,
}) => (
  <>
    {/* eraser (top) */}
    <rect x="36" y="6" width="28" height="12" rx="6" fill={eraserColour} />
    {/* metal band */}
    <rect x="36" y="16" width="28" height="6" fill={bandColour} />
    {/* barrel */}
    <rect x="36" y="22" width="28" height="48" rx="3" fill={barrelColour} />
    {/* shading stripe on barrel */}
    <rect x="54" y="22" width="6" height="48" rx="2" fill="rgba(255,255,255,0.18)" />
    {/* tip triangle */}
    <polygon points="36,70 64,70 50,88" fill={tipColour} />
    {/* graphite dot */}
    <circle cx="50" cy="86" r="3" fill="#555" />

    {/* face */}
    {/* left eye */}
    <ellipse cx="44" cy="40" rx="4" ry="4.5" fill="#fff" />
    <circle cx="44" cy="41" r="2.5" fill="#2D3436" />
    <circle cx="45" cy="39.5" r="1" fill="#fff" />
    {/* right eye */}
    <ellipse cx="56" cy="40" rx="4" ry="4.5" fill="#fff" />
    <circle cx="56" cy="41" r="2.5" fill="#2D3436" />
    <circle cx="57" cy="39.5" r="1" fill="#fff" />
    {/* smile */}
    <path d="M43 50 Q50 56 57 50" stroke="#2D3436" strokeWidth="2" fill="none" strokeLinecap="round" />

    {/* left arm */}
    <line x1="36" y1="44" x2="24" y2="56" stroke={barrelColour} strokeWidth="5" strokeLinecap="round" />
    {/* right arm waving */}
    <line x1="64" y1="44" x2="74" y2="30" stroke={barrelColour} strokeWidth="5" strokeLinecap="round" />
    {/* right hand dot */}
    <circle cx="75" cy="28" r="5" fill={barrelColour} />

    {faceExtra}
    {accessory}
  </>
)

// ─── variant definitions ───────────────────────────────────────────────────

const WizardHat = () => (
  <g>
    {/* brim */}
    <ellipse cx="50" cy="14" rx="20" ry="5" fill="#6C5CE7" />
    {/* cone */}
    <polygon points="38,14 62,14 50,-8" fill="#6C5CE7" />
    {/* star on hat */}
    <text x="47" y="8" fontSize="8" fill="#F5A623">★</text>
    {/* hat band */}
    <rect x="38" y="11" width="24" height="4" fill="#F5A623" />
  </g>
)

const GoldCrown = () => (
  <g>
    {/* crown base */}
    <rect x="34" y="10" width="32" height="10" rx="2" fill="#F5A623" />
    {/* crown points */}
    <polygon points="34,10 40,2 46,10" fill="#F5A623" />
    <polygon points="44,10 50,0 56,10" fill="#F5A623" />
    <polygon points="54,10 60,2 66,10" fill="#F5A623" />
    {/* jewels */}
    <circle cx="40" cy="14" r="2.5" fill="#E84393" />
    <circle cx="50" cy="14" r="2.5" fill="#00CEC9" />
    <circle cx="60" cy="14" r="2.5" fill="#E84393" />
  </g>
)

const CowboyHat = () => (
  <g>
    {/* brim */}
    <ellipse cx="50" cy="16" rx="24" ry="5" fill="#8B4513" />
    {/* crown */}
    <rect x="38" y="2" width="24" height="16" rx="4" fill="#A0522D" />
    {/* indent */}
    <path d="M50 2 Q44 8 50 12 Q56 8 50 2" fill="#8B4513" />
    {/* band */}
    <rect x="38" y="14" width="24" height="3" fill="#F5A623" />
  </g>
)

const Sunglasses = () => (
  <g>
    {/* frame */}
    <rect x="36" y="36" width="12" height="9" rx="3" fill="#E84393" opacity="0.85" />
    <rect x="52" y="36" width="12" height="9" rx="3" fill="#E84393" opacity="0.85" />
    <line x1="48" y1="40" x2="52" y2="40" stroke="#c0306a" strokeWidth="2" />
    {/* temples */}
    <line x1="36" y1="40" x2="30" y2="38" stroke="#c0306a" strokeWidth="2" />
    <line x1="64" y1="40" x2="70" y2="38" stroke="#c0306a" strokeWidth="2" />
    {/* stars */}
    <text x="18" y="34" fontSize="9" fill="#F5A623">✦</text>
    <text x="72" y="34" fontSize="9" fill="#F5A623">✦</text>
  </g>
)

const NinjaHeadband = () => (
  <g>
    {/* headband */}
    <rect x="34" y="18" width="32" height="8" rx="3" fill="#2D3436" />
    {/* knot */}
    <rect x="48" y="16" width="4" height="12" rx="2" fill="#636e72" />
    {/* ribbon tails */}
    <path d="M52 22 Q58 16 62 24" stroke="#636e72" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* kanji-style mark */}
    <text x="41" y="26" fontSize="7" fill="#F5A623" fontWeight="bold">忍</text>
  </g>
)

// ─── variant config map ─────────────────────────────────────────────────────

const VARIANTS: Record<AvatarVariantId, PencilProps> = {
  wizard: {
    barrelColour:  '#6C5CE7',
    bandColour:    '#5a4fcf',
    tipColour:     '#F5A623',
    eraserColour:  '#E84393',
    accessory:     <WizardHat />,
  },
  royal: {
    barrelColour:  '#2980B9',
    bandColour:    '#1a6fa3',
    tipColour:     '#BDC3C7',
    eraserColour:  '#F5A623',
    accessory:     <GoldCrown />,
  },
  explorer: {
    barrelColour:  '#F5A623',
    bandColour:    '#d4891c',
    tipColour:     '#BDC3C7',
    eraserColour:  '#6C5CE7',
    accessory:     <CowboyHat />,
  },
  popstar: {
    barrelColour:  '#E84393',
    bandColour:    '#c02f7a',
    tipColour:     '#F5A623',
    eraserColour:  '#FFF',
    accessory:     <Sunglasses />,
  },
  ninja: {
    barrelColour:  '#2D3436',
    bandColour:    '#1a1f20',
    tipColour:     '#636e72',
    eraserColour:  '#F5A623',
    accessory:     <NinjaHeadband />,
  },
}

// ─── main component ─────────────────────────────────────────────────────────

export const WritzAvatar: React.FC<WritzAvatarProps> = ({
  variant = 'wizard',
  size = 80,
  className = '',
  animated = false,
}) => {
  const props = VARIANTS[variant] ?? VARIANTS.wizard

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={animated ? { animation: 'writzBob 2s ease-in-out infinite' } : undefined}
      aria-label={`Writz avatar — ${variant}`}
      role="img"
    >
      <style>{`
        @keyframes writzBob {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
      `}</style>
      <PencilBody {...props} />
    </svg>
  )
}

export default WritzAvatar
