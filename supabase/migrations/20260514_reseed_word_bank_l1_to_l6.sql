-- ══════════════════════════════════════════════════════════════════
-- Migration: reseed bank_words for L1–6 Phase A steps
-- Replaces example-sentence words with vocabulary palettes.
-- Pupils now select their own subject noun from the noun section.
--
-- Rules applied:
--   • Never include "Sam" (example character only)
--   • Never include the exact verb / noun from the example sentence
--   • Linkable noun-verb pairs throughout
--   • All word classes required by the formula are represented
--   • Distractors column cleared (now replaced by vocabulary variety)
-- ══════════════════════════════════════════════════════════════════

-- ── LEVEL 1 ───────────────────────────────────────────────────────

-- L1 Step 1 (wbc_id=1, step_id=4)
-- Formula: Proper noun + V(past)  | Example: "Sam ran."
-- Nouns: proper names as subject options | Verbs: past (not "ran")
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['Maya','Jordan','Tom','Priya','Aisha','Jack',
                     'jumped','walked','skipped','played','shouted','fell'],
  distractors = NULL
WHERE id = 1;

-- L1 Step 2 (wbc_id=2, step_id=3)
-- Formula: Proper noun + V(past)  | Example: "Sam ran. / London shone."
-- Nouns: person names + place names | Verbs: past (not "ran" or "shone")
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['Maya','Jordan','Tom','Priya',
                     'London','Paris','Manchester',
                     'walked','jumped','fell','played','skipped','climbed'],
  distractors = NULL
WHERE id = 2;

-- L1 Step 3 (wbc_id=3, step_id=2)
-- Formula: Det + N(common) + V(past)  | Example: "Sam ran. The boy ran."
-- Det: the/a | Nouns: common (not "boy") | Verbs: past (not "ran")
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['the','a',
                     'girl','dog','cat','bird','child','fox',
                     'jumped','walked','skipped','played','shouted','fell'],
  distractors = NULL
WHERE id = 3;

-- ── LEVEL 2 ───────────────────────────────────────────────────────

-- L2 Step 1 (wbc_id=4, step_id=7)
-- Consolidation: Proper noun + V(past)  | Example: "Sam ran."
-- Proper nouns + past verbs (not "ran")
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['Maya','Jordan','Tom','Priya','Aisha','Jack',
                     'jumped','walked','skipped','played','shouted','fell'],
  distractors = NULL
WHERE id = 4;

-- L2 Step 2 (wbc_id=5, step_id=6)
-- New element: present tense  | Example: "Sam runs."
-- Proper nouns + present verbs (not "runs")
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['Maya','Jordan','Tom','Priya',
                     'walks','jumps','skips','plays','falls','climbs'],
  distractors = NULL
WHERE id = 5;

-- L2 Step 3 (wbc_id=6, step_id=5)
-- New element: Det+N + V(present)  | Example: "The boy runs."
-- Det + common nouns (not "boy") + present verbs (not "runs")
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['the','a',
                     'girl','dog','cat','bird','child','fox',
                     'walks','jumps','skips','plays','falls','climbs'],
  distractors = NULL
WHERE id = 6;

-- ── LEVEL 3 ───────────────────────────────────────────────────────

-- L3 Step 1 (wbc_id=7, step_id=11)
-- Consolidation: proper noun + V(past)  | Example: "Sam ran."
-- Proper nouns + nature nouns (linkable pairs) + past verbs (not "ran")
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['Maya','Jordan','Priya','Tom',
                     'sun','bird','eagle','wolf',
                     'jumped','walked','skipped','played','shouted','fell'],
  distractors = NULL
WHERE id = 7;

-- L3 Step 2 (wbc_id=8, step_id=10)
-- Consolidation: Det+N + V(present)  | Example: "The boy runs."
-- Det + common nouns (not "boy") + present verbs (not "runs")
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['the','a',
                     'girl','dog','cat','bird','child','fox',
                     'walks','jumps','skips','plays','falls','climbs'],
  distractors = NULL
WHERE id = 8;

-- L3 Step 3 (wbc_id=9, step_id=9)
-- New element: continuous  | Example: "Sam is running."
-- Proper nouns + helping verbs (is/was/are) + -ing forms (not "running")
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['Maya','Jordan','Tom','Priya',
                     'is','was','are',
                     'jumping','walking','playing','kicking','climbing','falling'],
  distractors = NULL
WHERE id = 9;

-- L3 Step 4 (wbc_id=10, step_id=8) — TENSE VARIETY
-- Three tenses side by side (dedicated UI needed — flat array interim)
-- Nouns + all three tense forms as complete chips (past / present / continuous)
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['Maya','Jordan','Tom','Priya',
                     'ran','walked','jumped','fell',
                     'runs','walks','jumps','falls',
                     'is running','is walking','is jumping','is falling'],
  distractors = NULL
WHERE id = 10;

-- ── LEVEL 4 ───────────────────────────────────────────────────────

-- L4 Step 1 (wbc_id=11, step_id=15)
-- Consolidation: proper noun + V(past)  | Example: "Sam ran."
-- Proper nouns + past verbs (not "ran")
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['Maya','Jordan','Tom','Priya',
                     'jumped','walked','skipped','played','shouted','fell'],
  distractors = NULL
WHERE id = 11;

-- L4 Step 2 (wbc_id=12, step_id=14)
-- Consolidation: continuous  | Example: "Sam is running."
-- Proper nouns + helping verbs + -ing forms (not "running")
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['Maya','Jordan','Tom','Priya',
                     'is','was','are',
                     'jumping','walking','playing','kicking','climbing','falling'],
  distractors = NULL
WHERE id = 12;

-- L4 Step 3 (wbc_id=13, step_id=13)
-- New element: object noun, past  | Target: "Sam kicked a ball."
-- Proper nouns + past verbs (not "kicked") + det + object nouns
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['Maya','Jordan','Tom','Priya',
                     'jumped','walked','pushed','threw','grabbed','carried',
                     'the','a',
                     'bag','book','stick','coin','leaf','cup'],
  distractors = NULL
WHERE id = 13;

-- L4 Step 4 (wbc_id=14, step_id=12)
-- New element: object noun, present  | Target: "Sam kicks a ball."
-- Proper nouns + present verbs (not "kicks") + det + object nouns
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['Maya','Jordan','Tom','Priya',
                     'walks','jumps','pushes','throws','grabs','carries',
                     'the','a',
                     'bag','book','stick','coin','leaf','cup'],
  distractors = NULL
WHERE id = 14;

-- ── LEVEL 5 ───────────────────────────────────────────────────────

-- L5 Step 1 (wbc_id=15, step_id=19)
-- Consolidation: proper noun + V(past) + obj  | Example: "Sam kicked a ball."
-- Proper nouns + past verbs (not "kicked") + det + object nouns
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['Maya','Jordan','Tom','Priya',
                     'jumped','walked','pushed','grabbed','dropped','threw',
                     'the','a',
                     'bag','book','stick','coin','leaf','cup'],
  distractors = NULL
WHERE id = 15;

-- L5 Step 2 (wbc_id=16, step_id=18)
-- Consolidation: continuous + obj  | Example: "Sam is kicking a ball."
-- Proper nouns + helping verbs + -ing forms (not "kicking") + det + obj nouns
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['Maya','Jordan','Tom','Priya',
                     'is','was','are',
                     'jumping','walking','pushing','grabbing','dropping','throwing',
                     'the','a',
                     'bag','book','stick','coin','leaf'],
  distractors = NULL
WHERE id = 16;

-- L5 Step 3 (wbc_id=17, step_id=17)
-- New element: Det+N subject, past  | Target: "The boy kicked a ball."
-- Det + common nouns (not "boy") + past verbs (not "kicked") + det + obj nouns
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['the','a',
                     'girl','dog','cat','bird','child','fox',
                     'jumped','walked','pushed','grabbed','dropped','threw',
                     'bag','book','stick','coin','leaf','cup'],
  distractors = NULL
WHERE id = 17;

-- L5 Step 4 (wbc_id=18, step_id=16)
-- New element: Det+N subject, present  | Target: "The boy kicks a ball."
-- Det + common nouns (not "boy") + present verbs (not "kicks") + det + obj nouns
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['the','a',
                     'girl','dog','cat','bird','child','fox',
                     'walks','jumps','pushes','grabs','drops','throws',
                     'bag','book','stick','coin','leaf','cup'],
  distractors = NULL
WHERE id = 18;

-- ── LEVEL 6 ───────────────────────────────────────────────────────

-- L6 Step 1 (wbc_id=19, step_id=24)
-- Consolidation: Det+N + V(past) + obj  | Example: "The boy kicked a ball."
-- Det + common nouns (not "boy") + past verbs (not "kicked") + det + obj nouns
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['the','a',
                     'girl','dog','cat','bird','child','fox',
                     'jumped','walked','pushed','grabbed','dropped','threw',
                     'bag','book','stick','coin','leaf','cup'],
  distractors = NULL
WHERE id = 19;

-- L6 Step 2 (wbc_id=20, step_id=23)
-- Consolidation: Det+N + V(present) + obj  | Example: "The boy kicks a ball."
-- Det + common nouns (not "boy") + present verbs (not "kicks") + det + obj nouns
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['the','a',
                     'girl','dog','cat','bird','child','fox',
                     'walks','jumps','pushes','grabs','drops','throws',
                     'bag','book','stick','coin','leaf','cup'],
  distractors = NULL
WHERE id = 20;

-- L6 Step 3 (wbc_id=21, step_id=22)
-- New element: definite "the" object, past  | Target: "The boy kicked the ball."
-- Det + common nouns (not "boy") + past verbs (not "kicked") + det + obj nouns incl. ball
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['the','a',
                     'girl','dog','cat','bird','child','fox',
                     'jumped','walked','pushed','grabbed','dropped','threw',
                     'ball','bag','book','stick','coin','leaf','cup'],
  distractors = NULL
WHERE id = 21;

-- L6 Step 4 (wbc_id=22, step_id=21)
-- New element: definite "the" object, present  | Target: "The boy kicks the ball."
-- Det + common nouns (not "boy") + present verbs (not "kicks") + det + obj nouns incl. ball
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['the','a',
                     'girl','dog','cat','bird','child','fox',
                     'walks','jumps','pushes','grabs','drops','throws',
                     'ball','bag','book','stick','coin','leaf','cup'],
  distractors = NULL
WHERE id = 22;

-- L6 Step 5 (wbc_id=23, step_id=20) — TENSE VARIETY
-- Three tenses (dedicated UI needed — flat array interim)
-- Det + common nouns + all three tense forms as complete verb-phrase chips
UPDATE pwp_word_bank_config SET
  bank_words = ARRAY['the','a',
                     'girl','dog','cat','bird','child','fox',
                     'kicked','kicks','is kicking',
                     'jumped','jumps','is jumping',
                     'walked','walks','is walking',
                     'ball','bag','book'],
  distractors = NULL
WHERE id = 23;
