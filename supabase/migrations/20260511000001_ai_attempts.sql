-- S6-4: Create ai_attempts table for logging assess-formula Edge Function calls.
-- Stores per-call data useful for monitoring AI usage, identifying error patterns,
-- and correlating difficulty_level with accuracy outcomes over time.

CREATE TABLE IF NOT EXISTS ai_attempts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id         UUID        NOT NULL,          -- auth.uid() of the requesting pupil
  level_id         TEXT        NOT NULL,          -- formula level string, e.g. 'L5'
  difficulty_level INTEGER     NOT NULL,          -- S6-4: integer form of level_id (1–67)
  attempt_number   INTEGER     NOT NULL DEFAULT 1, -- session attempt count passed in request
  overall_score    INTEGER,                       -- 0–100 result from AI
  common_error_type TEXT,                         -- null when no error detected
  confidence       NUMERIC(4,3),                  -- 0.000–1.000 AI confidence
  model            TEXT,                          -- model slug used (e.g. 'claude-haiku-4-5-20251001')
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying a pupil's attempt history efficiently
CREATE INDEX IF NOT EXISTS ai_attempts_pupil_idx    ON ai_attempts (pupil_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_attempts_level_idx    ON ai_attempts (difficulty_level);

-- RLS: pupils can read their own rows; service role (Edge Function) writes via service key
ALTER TABLE ai_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pupils can read their own AI attempt logs"
  ON ai_attempts FOR SELECT
  USING (auth.uid() = pupil_id);

-- Teachers can read attempts for pupils in their class
CREATE POLICY "Teachers can read AI attempts for their class pupils"
  ON ai_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      JOIN pupils p ON p.id = cm.pupil_id AND p.auth_user_id = ai_attempts.pupil_id
      WHERE c.teacher_id = auth.uid()
    )
  );
