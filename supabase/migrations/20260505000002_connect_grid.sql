-- Migration: connect_grid
-- Applied: 2026-05-05 (Session 24 — Connect Grid Planner)
--
-- 1. Adds w_level + active_genre to classes table (teacher sets per class)
-- 2. Creates grid_sessions table (pupil work per session)
-- 3. Creates grid_templates table (teacher-configured Column 2 defaults)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CLASSES — add w_level + active_genre
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS w_level  integer NOT NULL DEFAULT 2
                                    CHECK (w_level BETWEEN 1 AND 6),
  ADD COLUMN IF NOT EXISTS active_genre text NOT NULL DEFAULT 'narrative'
                                    CHECK (active_genre IN (
                                      'narrative', 'non_fiction', 'persuasive', 'poetry'
                                    ));

COMMENT ON COLUMN public.classes.w_level IS
  'Writing scaffold level 1–6 (spec §3.4). Default 2 — teacher advances manually.';
COMMENT ON COLUMN public.classes.active_genre IS
  'Genre currently selected for Connect Grid sessions. Teacher changes per unit.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. GRID_SESSIONS — pupil Connect Grid work per session
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.grid_sessions (
  id               uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pupil_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id         uuid                 REFERENCES public.classes(id)  ON DELETE SET NULL,
  session_date     date        NOT NULL DEFAULT CURRENT_DATE,
  anchor_sentence  text        NOT NULL DEFAULT '',
  genre            text        NOT NULL DEFAULT 'narrative'
                               CHECK (genre IN ('narrative','non_fiction','persuasive','poetry')),
  w_level          integer     NOT NULL DEFAULT 2 CHECK (w_level BETWEEN 1 AND 6),
  rows             jsonb       NOT NULL DEFAULT '[]'::jsonb,
  xp_earned        integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grid_sessions_class_date_idx
  ON public.grid_sessions (class_id, session_date DESC);

CREATE INDEX IF NOT EXISTS grid_sessions_pupil_idx
  ON public.grid_sessions (pupil_id, session_date DESC);

-- RLS
ALTER TABLE public.grid_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pupils read own grid sessions"
  ON public.grid_sessions FOR SELECT
  USING (pupil_id = auth.uid());

CREATE POLICY "Pupils insert own grid sessions"
  ON public.grid_sessions FOR INSERT
  WITH CHECK (pupil_id = auth.uid());

CREATE POLICY "Teachers read grid sessions for their classes"
  ON public.grid_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN  public.classes c ON c.id = cm.class_id
      WHERE cm.pupil_id  = grid_sessions.pupil_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "School admins read all grid sessions in their school"
  ON public.grid_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.school_admins
      WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. GRID_TEMPLATES — teacher-configured Col 2 + Col 3 defaults
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.grid_templates (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id      uuid                 REFERENCES public.classes(id) ON DELETE CASCADE,
  genre         text        NOT NULL CHECK (genre IN ('narrative','non_fiction','persuasive','poetry')),
  w_level       integer     NOT NULL CHECK (w_level BETWEEN 1 AND 6),
  -- 5-element JSON arrays — one entry per story stage (index 0–4)
  col2_defaults jsonb       NOT NULL DEFAULT '["","","","",""]'::jsonb,
  col3_hints    jsonb       NOT NULL DEFAULT '["","","","",""]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, genre, w_level)
);

-- Null class_id = global fallback (Anthropic/WriFe provided defaults)
CREATE UNIQUE INDEX IF NOT EXISTS grid_templates_global_idx
  ON public.grid_templates (genre, w_level)
  WHERE class_id IS NULL;

-- RLS
ALTER TABLE public.grid_templates ENABLE ROW LEVEL SECURITY;

-- Teachers read their own class templates + global defaults
CREATE POLICY "Teachers read templates for their classes"
  ON public.grid_templates FOR SELECT
  USING (
    class_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = grid_templates.class_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Teachers insert/update their own class templates
CREATE POLICY "Teachers insert templates for their classes"
  ON public.grid_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = grid_templates.class_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers update templates for their classes"
  ON public.grid_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = grid_templates.class_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Pupils can read templates for their class (needed at runtime to populate Col 2)
CREATE POLICY "Pupils read templates for their class"
  ON public.grid_templates FOR SELECT
  USING (
    class_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = grid_templates.class_id
        AND cm.pupil_id = auth.uid()
    )
  );

-- School admins read all templates in their school
CREATE POLICY "School admins read all templates"
  ON public.grid_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.school_admins WHERE user_id = auth.uid()
    )
  );
