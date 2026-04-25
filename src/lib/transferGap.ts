/**
 * WF-022 — Transfer Gap Metric
 * Classifies how well a pupil transfers formula/paragraph skills into extended writing.
 */

export type TransferGapClassification = 'strong' | 'developing' | 'at_risk'

/**
 * Classifies a pupil's transfer rate into a qualitative band.
 * rate: 0–1 (fraction of writing pieces where formula elements are detected)
 *
 * - strong:     rate >= 0.7
 * - developing: rate >= 0.5 and < 0.7
 * - at_risk:    rate < 0.5
 */
export const classifyTransferGap = (rate: number): TransferGapClassification => {
  if (rate >= 0.7) return 'strong'
  if (rate >= 0.5) return 'developing'
  return 'at_risk'
}

/** Human-readable label for a transfer gap classification */
export const transferGapLabel = (classification: TransferGapClassification): string => {
  switch (classification) {
    case 'strong': return 'Strong Transfer'
    case 'developing': return 'Developing'
    case 'at_risk': return 'Needs Support'
  }
}

/** Colour token (CSS var or hex) for a transfer gap classification */
export const transferGapColour = (classification: TransferGapClassification): string => {
  switch (classification) {
    case 'strong': return '#16A34A'
    case 'developing': return '#D97706'
    case 'at_risk': return '#DC2626'
  }
}
