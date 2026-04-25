/**
 * WF-042 — Certificate Engine
 * Awards certificates when pupils pass mastery gates.
 */

import { supabase } from './supabase'

export type CertificateType =
  | 'formula_mastery'
  | 'paragraph_mastery'
  | 'writing_band2'
  | 'writing_band3'
  | 'streak_30'

export interface Certificate {
  id: string
  pupil_id: string
  level_id: number
  certificate_type: CertificateType
  awarded_at: string
}

/**
 * Awards a certificate to a pupil.
 * Silently ignores duplicate (unique conflict) — safe to call multiple times.
 */
export async function awardCertificate(
  pupilId: string,
  levelId: number,
  type: CertificateType
): Promise<Certificate | null> {
  const { data, error } = await supabase
    .from('certificates')
    .insert({
      pupil_id: pupilId,
      level_id: levelId,
      certificate_type: type,
    })
    .select()
    .single()

  if (error) {
    // 23505 = unique_violation — already awarded, not an error for us
    if (error.code === '23505') return null
    console.error('awardCertificate error:', error)
    return null
  }

  return data as Certificate
}

/**
 * Fetch all certificates for a pupil.
 */
export async function getPupilCertificates(pupilId: string): Promise<Certificate[]> {
  const { data } = await supabase
    .from('certificates')
    .select('*')
    .eq('pupil_id', pupilId)
    .order('awarded_at', { ascending: false })

  return (data ?? []) as Certificate[]
}
