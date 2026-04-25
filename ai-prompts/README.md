# WriFe AI Assessment Prompts — Complete Handoff

This folder contains three comprehensive system prompt files for the WriFe gamified digital literacy platform. Each file documents the assessment rubrics and system prompts used by OpenAI's API to assess pupil work across WriFe's three learning layers.

---

## Files Overview

### 1. **formula-assessment.md** (461 lines)
**System Prompts for Formula Practice (Edge Function: `assess-formula`, uses gpt-4o-mini)**

- **Purpose:** Assess sentence-building at individual formula levels (L1–L67)
- **Contains:**
  - Edge Function input/output contract
  - Base system prompt (used for all levels)
  - Level-specific rubric additions (L1, L5, L7, L8, L10, L15, L19–20)
  - Common error detection table with specific feedback strings
  - Two complete example assessments (L5 and L10)
  - Scoring algorithm and confidence calculation
  - PII handling and implementation notes

**Key Features:**
- Colour-coded slot assessment (Red, Blue, Green, Orange, Yellow, Purple, Grey)
- Band scores 0–3 for each element
- Specific, actionable feedback using feedback language rules (no "wrong/incorrect")
- Common error types detected: adjective_placement, adverb_modification, tense_inconsistency, etc.

---

### 2. **paragraph-assessment.md** (757 lines)
**System Prompts for Paragraph Builder (Edge Function: `assess-paragraph`, uses gpt-4o-mini)**

- **Purpose:** Assess Lead → Support → Close paragraph structure across 4 genres and 4 phases
- **Contains:**
  - Edge Function input/output contract
  - Base system prompt (cohesion, genre match, tense/register, close quality)
  - Genre-specific system prompts and rubrics:
    - **Narrative:** Describe → Act → Reflect structure
    - **Non-Fiction:** Detail → Example → Explain structure
    - **Persuasive:** Reason → Evidence → Therefore structure
    - **Poetry:** Extend → Contrast → Echo structure
  - Phase-specific assessment guidance (Phases A–D; scaffolding adjustments)
  - Tense and register coherence assessment (L15+ and L19+)
  - Two complete example assessments (Narrative Phase A, Persuasive Phase B)
  - Implementation notes

**Key Features:**
- Four dimensions: cohesion, genre_match, tense_register, close_quality
- Genre-aware assessment with sentence-role expectations
- Phase-aware confidence adjustments (Phase A acknowledges scaffolding; Phase D assesses mastery)
- Feedback templates specific to each genre's growth areas

---

### 3. **writing-studio-assessment.md** (926 lines)
**System Prompts for Writing Studio (Edge Function: `assess-writing`, uses gpt-4o)**

- **Purpose:** Assess extended independent writing (100–700 words) against UK National Curriculum expectations
- **Contains:**
  - Edge Function input/output contract
  - Base system prompt (six dimensions: composition, vocabulary, grammar, punctuation, spelling, PAE)
  - Year-group-specific calibration (KS1 Yr1–2, KS2 Yr3–6, KS3 Yr7–9)
  - Genre-specific assessment additions (narrative, non-fiction, persuasive, poetry)
  - Dimension rubrics with year-group guidance:
    - **Composition:** Organisation, sequencing, paragraph structure
    - **Vocabulary:** Range, precision, register, figurative language
    - **Grammar:** Sentence boundaries, agreement, tense, complexity
    - **Punctuation:** Capital letters, full stops, commas, speech marks, advanced marks
    - **Spelling:** Phonetic accuracy, morphology, subject-specific terms
    - **Purpose/Audience/Effect (PAE):** Genre awareness, audience consideration, rhetorical effect
  - Detection features: LSC paragraph structure, WriFe formula integration
  - Low-confidence flagging rules (poetry grammar always flagged; pieces <80 words flagged for composition)
  - TAF statutory language mapping (band 0–3 to TAF labels)
  - Two complete example assessments (KS2 Yr4 Narrative, KS3 Yr8 Persuasive)
  - Implementation notes for Edge Function

**Key Features:**
- Six assessment dimensions independently scored (0–3)
- Year-group-calibrated expectations (KS1 ignores spelling/capitalisation focus; KS3 expects essay conventions)
- Poetry assessment includes unconventional punctuation/grammar caveat and mandatory teacher review flag
- Composite score mapping to TAF statutory language (Required for UK school reporting)
- Evidence citations (quoted text from pupil work to justify each dimension score)
- LSC and formula detection (recognises when pupil transfers formula-building skills to extended writing)

---

## Assessment Bands (Universal)

All three files use consistent band scoring:

- **0 (Pre-emergent):** Element missing or fundamentally wrong; incoherent
- **1 (Working Towards Expected Standard):** Element present with significant gaps or errors
- **2 (Working at Expected Standard):** Element is secure and age-appropriate
- **3 (Working at Greater Depth):** Element shows sophistication, precision, or exceeds expectations

---

## Feedback Language Rules (Applied Across All Prompts)

All feedback must follow these rules:

✓ **Always celebrate strength first** before addressing areas for growth  
✓ **Always cite the specific element** (slot, sentence position, dimension)  
✓ **Always provide concrete next-step suggestions** with example rewrites  
✗ Never use "wrong", "incorrect", "mistake", "error"  
✗ Never provide vague advice ("improve your sentences")  
✓ For formula: refer to slots by colour-code name (e.g. "Your Red slot")  
✓ For paragraph: refer by sentence position (Lead, Support 1, Support 2, Close)  
✓ For writing: provide rewritten sentence using pupil's own content  

---

## PII and Names Handling

All three prompts include critical instruction:

**"If the pupil's [sentence/paragraph/piece] contains any names, personal identifying information, or proper nouns referencing real people, IGNORE them completely. Do not repeat them in your feedback. Focus only on writing craft and composition."**

---

## Example Assessments Included

Each file includes fully worked example assessments to guide Edge Function implementation:

| File | Examples |
|---|---|
| **formula-assessment.md** | L5 (Adjective), L10 (Master Formula) |
| **paragraph-assessment.md** | Narrative Phase A, Persuasive Phase B |
| **writing-studio-assessment.md** | KS2 Yr4 Narrative (168 words), KS3 Yr8 Persuasive (246 words) |

Each example shows complete input → output flow, including:
- All six/four dimension scores
- Confidence scores per dimension
- Low-confidence flags (if applicable)
- Quoted evidence citations
- Warm comment + two specific growth areas with example rewrites
- Teacher summary and TAF band label

---

## Key Implementation Decisions

### Confidence Scoring
- Starts at 0.75–0.8 per dimension
- Adjusted up/down based on clarity, consistency, and alignment with year-group expectations
- Flagged for teacher review if < 0.65

### Composition in Poetry
- Grammar dimension is **always flagged** for teacher review (poetic syntax too unconventional)
- Pieces under 80 words are **always flagged** for composition dimension
- Spelling dimension is flagged if band 0 or 1

### Genre-Awareness
- Each genre has specific sentence roles and expectations
- Assessment focus changes by genre (e.g. sensory language for narrative, formal register for non-fiction)
- Poetry includes caveat on unconventional grammar/punctuation being acceptable if purposeful

### Phase-Awareness
- **Phase A:** Reduces confidence by 0.1; acknowledges that pupil had scaffolding
- **Phase B:** Transition; celebrates if Close is strong and independent
- **Phase C:** Full independence expected; no scaffolding acknowledged
- **Phase D:** Highest standard; assesses as polished, extended work

### TAF Statutory Language
- Writing Studio outputs include `taf_band_label` for UK school reporting:
  - Band 0 → "Pre-emergent"
  - Band 1 → "Working Towards Expected Standard"
  - Band 2 → "Working at Expected Standard"
  - Band 3 → "Working at Greater Depth"

---

## How to Use These Files

1. **For Edge Function Developers:**
   - Use the "Edge Function Contract" section to understand input/output schemas
   - Copy the "BASE SYSTEM PROMPT" directly into your OpenAI API call
   - Include level-specific or year-group-specific rubric additions in the same prompt
   - Implement scoring calculation and confidence logic as documented

2. **For Teachers (Background Understanding):**
   - Read the dimension rubrics to understand what scores mean
   - Review the example assessments to see full output format
   - Use "Common Growth Areas" and feedback templates to understand AI assessment style
   - Check TAF band labels to align with UK statutory reporting

3. **For QA/Testing:**
   - Use the example input/output pairs to validate Edge Function outputs
   - Check that feedback follows language rules (no "wrong/incorrect", specific examples)
   - Verify PII handling (names should be replaced, not repeated)
   - Confirm TAF labels map correctly to overall_band

---

## File Statistics

| File | Lines | Sections | Examples |
|---|---|---|---|
| formula-assessment.md | 461 | 11 | 2 |
| paragraph-assessment.md | 757 | 13 | 2 |
| writing-studio-assessment.md | 926 | 15 | 2 |
| **TOTAL** | **2,144** | **39** | **6** |

---

## Questions or Clarifications?

These prompts are complete and ready for implementation. They represent:
- **2,144 lines** of comprehensive rubrics and guidance
- **39 major sections** covering all assessment dimensions
- **6 fully worked example assessments** showing end-to-end output
- **Alignment with UK National Curriculum** and statutory TAF language
- **Sensitivity to pupil developmental stages** across KS1–KS3
- **GDPR compliance** (PII handling documented)
- **Constructive, strength-based feedback language** throughout

All system prompts are production-ready and designed to be passed directly to gpt-4o-mini (Formula/Paragraph) or gpt-4o (Writing Studio) via the OpenAI API.
