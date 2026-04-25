/**
 * WF-041 — Analytics Tab for Teacher Dashboard
 * SVG charts: formula progress, XP distribution, writing studio engagement, transfer gap
 * WF-048 — CSV export button
 */

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { classifyTransferGap, transferGapColour, transferGapLabel } from '../../lib/transferGap'
import type { PupilTransferRate } from '../../types/index'
import { exportToCSV } from '../../lib/csvExport'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressPoint {
  date: string
  avg_level: number
  class_name: string
}

interface ClassProgressRow {
  pupil_id: string
  first_name: string
  current_formula_level: number
  avg_score_last5: number | null
  current_streak: number
  total_xp: number
  writing_studio_unlocked: boolean
  last_session_date: string | null
}

// ─── Formula Progress Line Chart ──────────────────────────────────────────────

interface LineChartProps {
  points: ProgressPoint[]
}

function FormulaProgressChart({ points }: LineChartProps) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-48" style={{ color: 'var(--color-text-muted)' }}>
        No progress data for the last 30 days.
      </div>
    )
  }

  const W = 480
  const H = 180
  const PAD = { top: 20, right: 20, bottom: 40, left: 40 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const levels = points.map((p) => p.avg_level)
  const minLevel = Math.max(1, Math.floor(Math.min(...levels)) - 1)
  const maxLevel = Math.ceil(Math.max(...levels)) + 1

  const xScale = (i: number) => PAD.left + (i / (points.length - 1 || 1)) * chartW
  const yScale = (v: number) => PAD.top + chartH - ((v - minLevel) / (maxLevel - minLevel || 1)) * chartH

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(p.avg_level).toFixed(1)}`)
    .join(' ')

  // X-axis labels: show first, mid, last date
  const labelIndices = [0, Math.floor((points.length - 1) / 2), points.length - 1].filter(
    (v, i, a) => a.indexOf(v) === i
  )

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Formula progress over 30 days" role="img">
      {/* Y-axis grid lines */}
      {[minLevel, Math.round((minLevel + maxLevel) / 2), maxLevel].map((lvl) => {
        const y = yScale(lvl)
        return (
          <g key={lvl}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="var(--color-border)" strokeDasharray="4 3" />
            <text x={PAD.left - 6} y={y + 4} fontSize={10} textAnchor="end" fill="var(--color-text-muted)">
              L{lvl}
            </text>
          </g>
        )
      })}

      {/* Data line */}
      <path d={pathD} fill="none" stroke="var(--color-brand-primary)" strokeWidth={2.5} strokeLinejoin="round" />

      {/* Data dots */}
      {points.map((p, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(p.avg_level)} r={4} fill="var(--color-brand-primary)" />
      ))}

      {/* X-axis labels */}
      {labelIndices.map((i) => (
        <text key={i} x={xScale(i)} y={H - 6} fontSize={10} textAnchor="middle" fill="var(--color-text-muted)">
          {new Date(points[i].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </text>
      ))}
    </svg>
  )
}

// ─── XP Distribution Bar Chart ────────────────────────────────────────────────

interface XPBucket {
  label: string
  count: number
}

interface XPBarChartProps {
  buckets: XPBucket[]
}

function XPBarChart({ buckets }: XPBarChartProps) {
  const maxCount = Math.max(...buckets.map((b) => b.count), 1)
  const W = 320
  const H = 140
  const barW = 60
  const gap = 20
  const PAD = { top: 10, bottom: 40, left: 30, right: 10 }
  const chartH = H - PAD.top - PAD.bottom

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs" aria-label="XP distribution" role="img">
      {buckets.map((b, i) => {
        const barH = (b.count / maxCount) * chartH
        const x = PAD.left + i * (barW + gap)
        const y = PAD.top + chartH - barH
        return (
          <g key={b.label}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill="var(--color-brand-primary)" opacity={0.8} />
            <text x={x + barW / 2} y={y - 4} fontSize={11} textAnchor="middle" fill="var(--color-text)">
              {b.count}
            </text>
            <text x={x + barW / 2} y={H - 4} fontSize={10} textAnchor="middle" fill="var(--color-text-muted)">
              {b.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Writing Studio Donut ─────────────────────────────────────────────────────

interface DonutProps {
  unlocked: number
  locked: number
}

function WritingStudioDonut({ unlocked, locked }: DonutProps) {
  const total = unlocked + locked || 1
  const pct = unlocked / total
  const R = 50
  const cx = 70
  const cy = 70
  const circumference = 2 * Math.PI * R
  const strokeDasharray = `${(pct * circumference).toFixed(2)} ${circumference.toFixed(2)}`

  return (
    <svg viewBox="0 0 140 140" className="w-36 h-36" aria-label="Writing studio engagement" role="img">
      {/* Background circle */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--color-border)" strokeWidth={18} />
      {/* Foreground arc */}
      <circle
        cx={cx}
        cy={cy}
        r={R}
        fill="none"
        stroke="var(--color-brand-primary)"
        strokeWidth={18}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={(circumference * 0.25).toFixed(2)}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={18} fontWeight="bold" fill="var(--color-text)">
        {Math.round(pct * 100)}%
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize={10} fill="var(--color-text-muted)">
        unlocked
      </text>
    </svg>
  )
}

// ─── Transfer Gap Summary ─────────────────────────────────────────────────────

interface TransferGapRowProps {
  pupilName: string
  rate: number | null
}

function TransferGapRow({ pupilName, rate }: TransferGapRowProps) {
  if (rate === null) {
    return (
      <div className="flex items-center gap-3 py-1.5">
        <span className="text-sm w-32 truncate" style={{ color: 'var(--color-text)' }}>{pupilName}</span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No data</span>
      </div>
    )
  }

  const classification = classifyTransferGap(rate)
  const colour = transferGapColour(classification)
  const barPct = Math.round(rate * 100)

  return (
    <div className="flex items-center gap-3 py-1.5" data-testid={`transfer-gap-row-${pupilName}`}>
      <span className="text-sm w-32 truncate flex-shrink-0" style={{ color: 'var(--color-text)' }}>{pupilName}</span>
      <div className="flex-1 h-3 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className="h-3 rounded-full transition-all"
          style={{ width: `${barPct}%`, backgroundColor: colour }}
        />
      </div>
      <span className="text-xs w-16 text-right flex-shrink-0" style={{ color: colour }}>
        {barPct}% — {transferGapLabel(classification)}
      </span>
    </div>
  )
}

// ─── Main AnalyticsTab ────────────────────────────────────────────────────────

export function AnalyticsTab() {
  const [progressPoints, setProgressPoints] = useState<ProgressPoint[]>([])
  const [xpBuckets, setXPBuckets] = useState<XPBucket[]>([])
  const [unlockedCount, setUnlockedCount] = useState(0)
  const [totalPupils, setTotalPupils] = useState(0)
  const [transferData, setTransferData] = useState<{ name: string; rate: number | null }[]>([])
  const [allRows, setAllRows] = useState<ClassProgressRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [progressRes, classRes, transferRes] = await Promise.all([
        supabase
          .from('formula_sessions')
          .select('session_date, level_id')
          .gte('session_date', thirtyDaysAgo)
          .order('session_date', { ascending: true }),
        supabase.from('v_class_formula_progress').select('*'),
        supabase.from('v_pupil_transfer_rate').select('*'),
      ])

      // Build daily progress points (average level per day)
      if (progressRes.data) {
        const byDate: Record<string, number[]> = {}
        for (const s of progressRes.data as { session_date: string; level_id: number }[]) {
          if (!byDate[s.session_date]) byDate[s.session_date] = []
          byDate[s.session_date].push(s.level_id)
        }
        const pts: ProgressPoint[] = Object.entries(byDate).map(([date, levels]) => ({
          date,
          avg_level: levels.reduce((a, b) => a + b, 0) / levels.length,
          class_name: 'All Classes',
        }))
        setProgressPoints(pts)
      }

      // XP buckets from class progress
      if (classRes.data) {
        const rows = classRes.data as ClassProgressRow[]
        setAllRows(rows)
        setTotalPupils(rows.length)
        setUnlockedCount(rows.filter((r) => r.writing_studio_unlocked).length)

        const buckets: XPBucket[] = [
          { label: '0–999', count: rows.filter((r) => r.total_xp < 1000).length },
          { label: '1k–4.9k', count: rows.filter((r) => r.total_xp >= 1000 && r.total_xp < 5000).length },
          { label: '5k+', count: rows.filter((r) => r.total_xp >= 5000).length },
        ]
        setXPBuckets(buckets)
      }

      // Transfer gap data
      if (transferRes.data && classRes.data) {
        const classRows = classRes.data as ClassProgressRow[]
        const transferRows = transferRes.data as PupilTransferRate[]
        const td = classRows.map((r) => ({
          name: r.first_name,
          rate: transferRows.find((t) => t.pupil_id === r.pupil_id)?.success_rate_last_5 ?? null,
        }))
        setTransferData(td)
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const handleExportCSV = () => {
    const transferRateMap: Record<string, number | null> = {}
    transferData.forEach((t) => { transferRateMap[t.name] = t.rate })

    const csvData = allRows.map((r) => ({
      pupil_name: r.first_name,
      formula_level: r.current_formula_level,
      avg_score_last5: r.avg_score_last5 ?? '',
      current_streak: r.current_streak,
      total_xp: r.total_xp,
      transfer_rate: transferRateMap[r.first_name] != null ? Math.round((transferRateMap[r.first_name] as number) * 100) + '%' : '',
      writing_studio_unlocked: r.writing_studio_unlocked ? 'Yes' : 'No',
      last_active_date: r.last_session_date ?? '',
    }))

    exportToCSV(csvData, `wrife-class-progress-${new Date().toISOString().split('T')[0]}.csv`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: 'var(--color-text-muted)' }}>
        Loading analytics…
      </div>
    )
  }

  return (
    <div className="space-y-8" data-testid="analytics-tab">
      {/* Header + Export */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }} data-tts="Analytics">
          Analytics
        </h2>
        <button
          type="button"
          onClick={handleExportCSV}
          data-testid="export-csv-button"
          data-tts="Export class data as CSV"
          className="text-sm px-4 py-2 rounded-lg font-medium"
          style={{
            backgroundColor: 'var(--color-brand-primary)',
            color: '#fff',
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Formula Progress */}
      <section className="rounded-xl p-5 print-section" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          Formula Level Progress — Last 30 Days
        </h3>
        <FormulaProgressChart points={progressPoints} />
      </section>

      {/* XP Distribution + Studio Engagement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section className="rounded-xl p-5 print-section" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            XP Distribution
          </h3>
          <XPBarChart buckets={xpBuckets} />
        </section>

        <section className="rounded-xl p-5 print-section" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            Writing Studio Engagement
          </h3>
          <div className="flex items-center gap-5">
            <WritingStudioDonut unlocked={unlockedCount} locked={totalPupils - unlockedCount} />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: 'var(--color-brand-primary)' }} />
                <span style={{ color: 'var(--color-text)' }}>Unlocked: {unlockedCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: 'var(--color-border)' }} />
                <span style={{ color: 'var(--color-text)' }}>Locked: {totalPupils - unlockedCount}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Transfer Gap Summary */}
      <section className="rounded-xl p-5 print-section" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          Transfer Gap — Pupil Summary
        </h3>
        {transferData.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No transfer data available yet.</p>
        ) : (
          <div className="space-y-0.5">
            {transferData.map((t) => (
              <TransferGapRow key={t.name} pupilName={t.name} rate={t.rate} />
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3 mt-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {(['strong', 'developing', 'at_risk'] as const).map((c) => (
            <span key={c} className="px-2 py-0.5 rounded-full" style={{ backgroundColor: transferGapColour(c) + '18', color: transferGapColour(c) }}>
              {transferGapLabel(c)}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
