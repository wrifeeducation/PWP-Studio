-- Migration: Add RLS policies for parent_pupil table and parent→pupil profile reads
-- Session 27

-- Allow parents to SELECT their own links
CREATE POLICY "Parents can read own links"
  ON public.parent_pupil
  FOR SELECT
  USING (parent_id = auth.uid());

-- Allow parents to SELECT profiles of their linked pupils
-- (the existing "Users can view own profile" policy handles the parent's own row;
--  this new policy handles the pupil rows they're linked to)
CREATE POLICY "Parents can read linked pupil profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_pupil
      WHERE parent_pupil.parent_id = auth.uid()
        AND parent_pupil.pupil_id = profiles.id
    )
  );
