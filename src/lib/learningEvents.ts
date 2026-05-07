/**
 * learningEvents.ts
 *
 * Inserts rows into the shared `learning_events` table so that wrife.co.uk
 * teacher dashboard can display real-time cross-app progress from PWP Studio.
 *
 * Table is owned by wrife-website — this file does INSERT only, never ALTER.
 * class_id is nullable: home learners and independent teacher pupils pass null.
 */

import { supabase } from './supabase'

/**
 * Insert a single learning_events row for PWP Studio.
 *
 * @param pupilId    - Supabase auth UID of the pupil
 * @param classId    - class_id from the pupil's profile (null for home learners)
 * @param eventType  - One of: 'formula_completed', 'chain_session_completed', 'free_practice_session', 'pwp_level_advanced'
 * @param eventData  - App-specific payload (see brand-ecosystem skill for shapes)
 */
export async function insertLearningEvent(
  pupilId: string,
  classId: string | null,
  eventType: string,
  eventData: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await supabase.from('learning_events').insert({
      pupil_id: pupilId,
      app: 'pwp',
      event_type: eventType,
      event_data: eventData,
      class_id: classId ?? null,
    })

    if (error) {
      console.error('insertLearningEvent (pwp): insert failed', error)
    }
  } catch (err) {
    console.error('insertLearningEvent (pwp): unexpected error', err)
  }
}
