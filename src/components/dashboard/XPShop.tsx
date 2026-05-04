/**
 * WF-035: XPShop — pupils spend XP to buy Streak Shield or Double XP Day.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import type { PupilProgress } from '../../types/index'

const SHIELD_COST = 500
const DOUBLE_XP_COST = 1000
const DOUBLE_XP_DURATION_HOURS = 24

interface XPShopProps {
  progress: PupilProgress
  onPurchase: () => void
}

interface ShopItem {
  id: 'shield' | 'double_xp'
  icon: string
  name: string
  description: string
  cost: number
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'shield',
    icon: '🛡️',
    name: 'Streak Shield',
    description: 'Protects your streak for one missed school day.',
    cost: SHIELD_COST,
  },
  {
    id: 'double_xp',
    icon: '⚡',
    name: 'Double XP Day',
    description: 'Doubles all XP earned for the next 24 hours.',
    cost: DOUBLE_XP_COST,
  },
]

export const XPShop: React.FC<XPShopProps> = ({ progress, onPurchase }) => {
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const totalXP = progress.total_xp

  const showFlash = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2500)
  }

  const handleBuy = async (item: ShopItem) => {
    if (totalXP < item.cost || purchasing) return
    setPurchasing(item.id)
    try {
      const updates: Record<string, unknown> = {
        total_xp: totalXP - item.cost,
      }

      if (item.id === 'shield') {
        updates.streak_shield_active = true
      } else if (item.id === 'double_xp') {
        const until = new Date()
        until.setHours(until.getHours() + DOUBLE_XP_DURATION_HOURS)
        updates.double_xp_until = until.toISOString()
      }

      const { error } = await supabase
        .from('formula_progress')
        .update(updates)
        .eq('pupil_id', progress.pupil_id)

      if (error) throw error
      showFlash(`${item.name} purchased! ${item.cost} XP spent.`)
      onPurchase()
    } catch {
      showFlash('Purchase failed. Please try again.')
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      data-testid="xp-shop"
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text)' }}
          data-tts="XP Shop"
        >
          🏪 XP Shop
        </h3>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#FEF9C3', color: '#78350F' }}
          data-tts={`${totalXP} XP available`}
        >
          ⭐ {totalXP.toLocaleString()} XP
        </span>
      </div>

      <AnimatePresence>
        {flash && (
          <motion.p
            key="flash"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs mb-3 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: '#F0FDF4', color: '#166534' }}
            role="status"
          >
            {flash}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {SHOP_ITEMS.map((item) => {
          const canAfford = totalXP >= item.cost
          const alreadyHasShield = item.id === 'shield' && progress.streak_shield_active
          const disabled = !canAfford || alreadyHasShield || purchasing !== null

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                opacity: disabled && purchasing === null ? 0.7 : 1,
              }}
              data-testid={`shop-item-${item.id}`}
            >
              <span className="text-2xl flex-shrink-0" aria-hidden="true">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text)' }}
                  data-tts={item.name}
                >
                  {item.name}
                  {alreadyHasShield && (
                    <span className="ml-2 text-xs font-normal" style={{ color: '#16A34A' }}>
                      (active)
                    </span>
                  )}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {item.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleBuy(item)}
                disabled={disabled}
                data-testid={`buy-${item.id}`}
                aria-label={`Buy ${item.name} for ${item.cost} XP`}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap flex-shrink-0 transition-opacity"
                style={{
                  backgroundColor: canAfford && !alreadyHasShield ? 'var(--color-brand-primary)' : 'var(--color-border)',
                  color: canAfford && !alreadyHasShield ? '#fff' : 'var(--color-text-muted)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: purchasing === item.id ? 0.6 : 1,
                }}
              >
                {purchasing === item.id
                  ? 'Buying…'
                  : alreadyHasShield
                  ? 'Active'
                  : `${item.cost.toLocaleString()} XP`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
