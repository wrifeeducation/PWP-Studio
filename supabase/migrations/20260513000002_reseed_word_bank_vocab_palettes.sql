-- ================================================================
-- Migration: reseed_word_bank_vocab_palettes
-- Purpose: Fix word bank seeding to use vocabulary palettes
--          (not example sentence words) and add missing gap_slots
--          for L7-9 consolidation steps.
-- Ref: PWP_Word_Bank_Clarification.md (May 2026)
-- ================================================================

UPDATE pwp_steps SET subject_prompt = 'Sam' WHERE id = 3;
UPDATE pwp_steps SET example = 'Sam ran.' WHERE id IN (13, 12);
UPDATE pwp_steps SET example = 'Sam kicked a ball.' WHERE id IN (17, 16);
UPDATE pwp_steps SET example = 'The boy kicked a ball.' WHERE id IN (22, 21);
UPDATE pwp_steps SET example = '' WHERE id IN (28,27,26,25,32,31,30,29,37,36,35,34,33);

UPDATE pwp_word_bank_config SET bank_words = ARRAY['jumped','walked','skipped','played','shouted','fell'], distractors = NULL WHERE id = 1;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['London','Paris','Maya','Jordan','walked','jumped','ran','fell','played','skipped'], distractors = NULL WHERE id = 2;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['jumped','walked','skipped','played','shouted','fell'], distractors = NULL WHERE id = 3;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['jumped','walked','skipped','played','shouted','fell'], distractors = NULL WHERE id = 4;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['walks','jumps','skips','plays','falls','climbs'], distractors = NULL WHERE id = 5;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['walks','jumps','skips','plays','falls','climbs'], distractors = NULL WHERE id = 6;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['jumped','walked','skipped','played','shouted','fell'], distractors = NULL WHERE id = 7;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['walks','jumps','skips','plays','falls','climbs'], distractors = NULL WHERE id = 8;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['is','was','are','jumping','walking','playing','kicking','climbing','falling'], distractors = NULL WHERE id = 9;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['ran','runs','is','running'], distractors = NULL WHERE id = 10;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['jumped','walked','skipped','played','shouted','fell'], distractors = NULL WHERE id = 11;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['is','was','are','jumping','walking','playing','kicking','climbing','falling'], distractors = NULL WHERE id = 12;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['jumped','walked','skipped','played','pushed','threw','the','a','bag','book','stick','coin','leaf','cup'], distractors = NULL WHERE id = 13;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['walks','jumps','skips','plays','pushes','throws','the','a','bag','book','stick','coin','leaf','cup'], distractors = NULL WHERE id = 14;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['jumped','walked','pushed','grabbed','dropped','threw','the','a','bag','book','stick','coin','leaf','cup'], distractors = NULL WHERE id = 15;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['is','was','are','jumping','walking','pushing','grabbing','dropping','throwing','the','a','bag','book','stick','coin'], distractors = NULL WHERE id = 16;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['jumped','walked','pushed','grabbed','dropped','threw','the','a','bag','book','stick','coin','leaf','cup'], distractors = NULL WHERE id = 17;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['walks','jumps','pushes','grabs','drops','throws','the','a','bag','book','stick','coin','leaf','cup'], distractors = NULL WHERE id = 18;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['jumped','walked','pushed','grabbed','dropped','threw','the','a','bag','book','stick','coin','leaf','cup'], distractors = NULL WHERE id = 19;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['walks','jumps','pushes','grabs','drops','throws','the','a','bag','book','stick','coin','leaf','cup'], distractors = NULL WHERE id = 20;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['jumped','walked','pushed','grabbed','dropped','threw','the','a','bag','book','stick','coin','leaf','cup'], distractors = NULL WHERE id = 21;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['walks','jumps','pushes','grabs','drops','throws','the','a','bag','book','stick','coin','leaf','cup'], distractors = NULL WHERE id = 22;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['kicked','kicks','is','kicking','walked','walks','the','a','ball','bag','book'], distractors = NULL WHERE id = 23;
UPDATE pwp_word_bank_config SET bank_words = '{}'::text[], distractors = NULL, gap_slots = '[{"position":3,"word_class":"verb","label":"V"}]'::jsonb WHERE id = 24;
UPDATE pwp_word_bank_config SET bank_words = '{}'::text[], distractors = NULL, gap_slots = '[{"position":4,"word_class":"verb","label":"V"}]'::jsonb WHERE id = 25;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['small','old','young','strong','dark','red','busy','thin','loud'], distractors = NULL WHERE id = 26;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['small','old','young','strong','dark','red','busy','thin'], distractors = NULL, gap_slots = '[{"position":2,"word_class":"adjective","label":"ADJ"},{"position":4,"word_class":"verb","label":"V"}]'::jsonb WHERE id = 27;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['small','old','young','strong','dark','red','busy','thin'], distractors = NULL, gap_slots = '[{"position":2,"word_class":"adjective","label":"ADJ"},{"position":4,"word_class":"verb","label":"V"}]'::jsonb WHERE id = 28;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['small','old','young','strong','dark','red','busy','thin'], distractors = NULL, gap_slots = '[{"position":2,"word_class":"adjective","label":"ADJ"},{"position":5,"word_class":"verb","label":"V"}]'::jsonb WHERE id = 29;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['tall','small','old','young','dark','busy','thin','loud'], distractors = NULL WHERE id = 30;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['tall','small','old','young','dark','busy','thin','loud'], distractors = NULL WHERE id = 31;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['tall','small','old','young','dark','busy','thin','loud'], distractors = NULL, gap_slots = '[{"position":3,"word_class":"verb","label":"V"},{"position":5,"word_class":"adjective","label":"ADJ"}]'::jsonb WHERE id = 32;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['small','old','young','strong','dark','red','busy','thin'], distractors = NULL, gap_slots = '[{"position":2,"word_class":"adjective","label":"ADJ"},{"position":4,"word_class":"verb","label":"V"}]'::jsonb WHERE id = 33;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['small','old','young','strong','dark','busy','thin','loud'], distractors = NULL, gap_slots = '[{"position":2,"word_class":"adjective","label":"ADJ"},{"position":6,"word_class":"adjective","label":"ADJ"}]'::jsonb WHERE id = 34;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['small','old','young','strong','dark','busy','thin','loud'], distractors = NULL, gap_slots = '[{"position":2,"word_class":"adjective","label":"ADJ"},{"position":6,"word_class":"adjective","label":"ADJ"}]'::jsonb WHERE id = 35;
UPDATE pwp_word_bank_config SET bank_words = ARRAY['small','old','young','strong','dark','busy','thin','loud'], distractors = NULL, gap_slots = '[{"position":2,"word_class":"adjective","label":"ADJ"},{"position":7,"word_class":"adjective","label":"ADJ"}]'::jsonb WHERE id = 36;
