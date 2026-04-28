/**
 * NC (National Curriculum) objectives mapped to WriFe PWP formula levels.
 * Objectives are drawn from the English KS1–KS3 writing curriculum.
 * Each objective has an `unlockAt` level — the WriFe level at which the
 * pupil is considered to have met this NC objective through formula mastery.
 */

export interface NCObjective {
  id: string
  label: string
  ks: 'KS1' | 'KS2 Y3/4' | 'KS2 Y5/6' | 'KS3'
  unlockAt: number // WriFe level threshold
}

export const NC_OBJECTIVES: NCObjective[] = [
  // ── KS1 (Years 1–2) ────────────────────────────────────────────────────────
  {
    id: 'ks1-nouns',
    label: 'Use nouns and noun phrases with determiners',
    ks: 'KS1',
    unlockAt: 4,
  },
  {
    id: 'ks1-adjectives',
    label: 'Describe nouns with adjectives',
    ks: 'KS1',
    unlockAt: 8,
  },
  // ── KS2 Y3/4 (Years 3–4) ───────────────────────────────────────────────────
  {
    id: 'ks2a-verb-phrases',
    label: 'Use verb phrases (main verb + auxiliary)',
    ks: 'KS2 Y3/4',
    unlockAt: 15,
  },
  {
    id: 'ks2a-adverbials',
    label: 'Use fronted adverbials to open sentences',
    ks: 'KS2 Y3/4',
    unlockAt: 20,
  },
  {
    id: 'ks2a-prepositions',
    label: 'Use prepositional phrases for place and time',
    ks: 'KS2 Y3/4',
    unlockAt: 25,
  },
  {
    id: 'ks2a-conjunctions',
    label: 'Use coordinating conjunctions (and, but, so, or)',
    ks: 'KS2 Y3/4',
    unlockAt: 38,
  },
  // ── KS2 Y5/6 (Years 5–6) ───────────────────────────────────────────────────
  {
    id: 'ks2b-relative-clauses',
    label: 'Use relative clauses beginning with who, which, where, that',
    ks: 'KS2 Y5/6',
    unlockAt: 35,
  },
  {
    id: 'ks2b-subordination',
    label: 'Use subordinating conjunctions for complex sentences',
    ks: 'KS2 Y5/6',
    unlockAt: 45,
  },
  {
    id: 'ks2b-compound-complex',
    label: 'Write compound and complex sentences',
    ks: 'KS2 Y5/6',
    unlockAt: 50,
  },
  // ── KS3 (Years 7–9) ────────────────────────────────────────────────────────
  {
    id: 'ks3-embedded-clauses',
    label: 'Use embedded (parenthetical) clauses for effect',
    ks: 'KS3',
    unlockAt: 55,
  },
  {
    id: 'ks3-passive',
    label: 'Use the passive voice for formal and analytical writing',
    ks: 'KS3',
    unlockAt: 58,
  },
  {
    id: 'ks3-varied-openers',
    label: 'Vary sentence openings for rhetorical effect',
    ks: 'KS3',
    unlockAt: 60,
  },
]

// ─── NC Band thresholds by year group ─────────────────────────────────────────
// Bands: 'below' | 'working' | 'meeting' | 'exceeding'
// Each band is defined as [min, max] level range (inclusive).
// 'exceeding' is open-ended (from the upper bound to L67).

export type NCBand = 'below' | 'working' | 'meeting' | 'exceeding'

interface BandThresholds {
  below: [number, number]
  working: [number, number]
  meeting: [number, number]
  exceeding: [number, number]
}

// Year group → expected level bands.
// These reflect the national curriculum pace expectations.
export const NC_YEAR_GROUP_BANDS: Record<number, BandThresholds> = {
  1:  { below: [1, 1],   working: [2, 3],   meeting: [4, 5],   exceeding: [6, 67] },
  2:  { below: [1, 3],   working: [4, 5],   meeting: [6, 8],   exceeding: [9, 67] },
  3:  { below: [1, 7],   working: [8, 10],  meeting: [11, 15], exceeding: [16, 67] },
  4:  { below: [1, 10],  working: [11, 14], meeting: [15, 20], exceeding: [21, 67] },
  5:  { below: [1, 18],  working: [19, 24], meeting: [25, 30], exceeding: [31, 67] },
  6:  { below: [1, 25],  working: [26, 32], meeting: [33, 40], exceeding: [41, 67] },
  7:  { below: [1, 35],  working: [36, 42], meeting: [43, 50], exceeding: [51, 67] },
  8:  { below: [1, 44],  working: [45, 50], meeting: [51, 57], exceeding: [58, 67] },
  9:  { below: [1, 50],  working: [51, 55], meeting: [56, 60], exceeding: [61, 67] },
}

// Default thresholds used when year group is unknown (Y4 baseline)
const DEFAULT_THRESHOLDS = NC_YEAR_GROUP_BANDS[4]

/** Get the NC band for a pupil based on their current level and year group */
export function getNcBand(level: number, yearGroup?: number | null): NCBand {
  const thresholds = (yearGroup && NC_YEAR_GROUP_BANDS[yearGroup]) ?? DEFAULT_THRESHOLDS
  if (level <= thresholds.below[1]) return 'below'
  if (level <= thresholds.working[1]) return 'working'
  if (level <= thresholds.meeting[1]) return 'meeting'
  return 'exceeding'
}

/** Human-readable label for each band */
export const BAND_LABELS: Record<NCBand, string> = {
  below:     'Below Expected',
  working:   'Working Towards',
  meeting:   'Meeting Expected',
  exceeding: 'Exceeding Expected',
}

/** Short label for compact display */
export const BAND_SHORT_LABELS: Record<NCBand, string> = {
  below:     'Below',
  working:   'Working Towards',
  meeting:   'Meeting',
  exceeding: 'Exceeding',
}

/** Colour for each band (background) */
export const BAND_COLOURS: Record<NCBand, string> = {
  below:     '#FEE2E2',
  working:   '#FEF9C3',
  meeting:   '#DCFCE7',
  exceeding: '#DBEAFE',
}

/** Text colour for each band */
export const BAND_TEXT_COLOURS: Record<NCBand, string> = {
  below:     '#DC2626',
  working:   '#A16207',
  meeting:   '#16A34A',
  exceeding: '#1D4ED8',
}

/** KS colours for objective group headers */
export const KS_COLOURS: Record<NCObjective['ks'], { bg: string; text: string }> = {
  'KS1':       { bg: '#EDE7F6', text: '#6C5CE7' },
  'KS2 Y3/4':  { bg: '#FFF3E0', text: '#F5A623' },
  'KS2 Y5/6':  { bg: '#E8F5E9', text: '#27AE60' },
  'KS3':       { bg: '#FCE4EC', text: '#E84393' },
}
