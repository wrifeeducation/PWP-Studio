# PWP Framework — Progressive Writing Practice
**Version 1.1 — May 2026**
*Designed from first principles. Replaces the previous 67-level model.*
*All architectural decisions confirmed. This is the build reference document.*

---

## The Core Principle

PWP exists to make grammatical learning permanent through deliberate daily practice. Pupils learn a concept in the classroom, then immediately apply it in PWP — and keep applying it as new concepts are added on top. The goal is not formula completion. It is internalisation: the pupil can manipulate word classes fluently, instinctively, and purposefully.

---

## The Three Layers of a PWP Session

### Layer 1 — The Formula Chain (Sentence Evolution)

A session is built around one subject noun. The pupil writes a simple sentence using that subject, then rewrites it N times — each rewrite following a new formula that adds or restructures a grammatical element. The sentence grows in complexity. By the final step, it is the most technically sophisticated sentence the pupil can currently construct.

**The subject noun** stays constant throughout the session. The teacher may set a weekly class theme noun, or pupils may choose their own.

**Each step of the chain:**
1. The pupil sees their previous sentence (for reference)
2. They see the formula instruction — e.g., *"Now add an adverb that tells the reader HOW"*
3. They write a completely fresh sentence from scratch, incorporating the new element
4. The AI assesses the sentence: does it correctly follow the formula? Is it grammatically sound?
5. Feedback is given. The pupil may revise, then advances to the next step.

**The chain length** is not fixed at 12. It is determined by how far the pupil has progressed through the WriFe curriculum. A pupil after L10 has 3–4 formula steps available. A pupil after L15 has 8–10. A Y5–6 pupil working through compound/complex sentences may have 12+ steps. The chain grows with the curriculum.

**The final sentence of the chain** is always the most technically complex sentence the pupil can write at their current level. This becomes the topic sentence (Lead) of their paragraph.

---

### Layer 2 — The Paragraph

Once the formula chain is complete, the pupil writes a short paragraph using their final sentence as the anchor.

| Part | Content | Constraint |
|------|---------|------------|
| **Lead (Topic Sentence)** | The final formula sentence from the chain | Already written — pupil uses it as-is |
| **Support (2–3 sentences)** | Pupil develops the idea freely | No formula constraint — free writing |
| **Close (Concluding Sentence)** | Pupil writes one final sentence | Must be more technically complex than the support sentences — AI-assessed |

The paragraph is introduced to the pupil only after L26 (Paragraph Structure) has been taught. Before L26, sessions end with the formula chain only.

---

### Layer 3 — The Mastery Quiz

Before a pupil's chain length increases (i.e., before a new formula step is added to their chain), the system presents a mastery quiz for the new formula element.

**How the quiz works:**
- The AI generates a series of formula instructions, varying the permutations (different subjects, different tenses, different verb types including phrasal verbs, different sentence purposes)
- The pupil constructs a sentence for each prompt
- The AI assesses correctness
- The quiz is passed when the pupil demonstrates consistent control across the permutations — not a fixed count, but qualitative mastery as judged by the AI
- On passing: the new formula step is added to their chain for future sessions
- Teacher can always override and manually advance or hold a pupil

---

## The Formula Library — Design Principles

The formula library is **curriculum-anchored** and **compositional**. It is not a fixed list of 28 or 67 items. It is a map of formula elements — each tagged to the WriFe lesson that introduced it — that combine to generate formula steps dynamically.

### Curriculum Anchor Map

| WriFe Lesson | Concept Introduced | Formula Elements Unlocked |
|---|---|---|
| **L7** | Nouns + Determiners | `noun`, `determiner + noun` |
| **L8** | Common/Proper Nouns | `proper noun` as subject |
| **L9** | Main + Helping Verbs | `verb (main)`, `helping verb + verb` |
| **L10** | Present/Past/Continuous Tense | `verb (present)`, `verb (past)`, `is/was + verb-ing` — **PWP launches** |
| **L11** | Subject + Verb + Object | `subject + verb + object` |
| **L12** | Adjectives | `adjective + noun`, `adjective + object` |
| **L13** | Adverbs | `verb + adverb (how)`, `verb + adverb (when)`, `verb + adverb (where)` |
| **L14** | Pronouns | `pronoun` as subject replacement |
| **L15** | Prepositions | `prepositional phrase` (in/on/under/before/after/beside...) |
| **L18** | Statements + Questions | question form (`auxiliary + subject + verb + object?`) |
| **L19** | Commands + Exclamations | imperative (`verb + object`), exclamative (`What/How + adjective + noun!`) |
| **L20** | Phrases | `noun phrase`, `adverb phrase`, `prepositional phrase` as named units |
| **L21–22** | Clauses | `independent clause`, `dependent clause`, `subordinator` |
| **L25** | Simple Sentence Patterns | `subject + verb + adverbial`, fronted adverbial (`adverb, + subject + verb`) |
| **L26** | Paragraph Structure | **Paragraph phase of PWP activates** |
| **L30** | Compound + Complex Sentences | `clause + FANBOYS + clause`, `subordinator + clause + , + main clause` |
| **L32** | Noun/Adjective/Adverbial Phrases | stacked/embedded phrases as modifiers |
| **L33** | Transitions | transitional phrases at sentence openings |
| **L49–51** | Cohesion devices | reference words, connectives, adverbials for flow |

### How the Formula Chain Is Generated

Given a pupil's current curriculum position (i.e., the highest lesson they have studied), the system:

1. Looks up all formula elements available at that position
2. Generates a chain of steps from simplest to most complex, using only available elements
3. Each step adds or restructures exactly one element relative to the previous sentence

**Example: Pupil who has completed up to L13 (Adverbs)**

Available elements: determiner, noun, proper noun, helping verb, main verb, tense (present/past/continuous), subject, object, adjective (noun/object), adverb (how/when/where)

Generated chain:
| Step | Formula | Example |
|------|---------|---------|
| 1 | noun + verb (past) | Sam ran. |
| 2 | noun + verb + object | Sam ran the race. |
| 3 | determiner + noun + verb + object | The boy ran the race. |
| 4 | determiner + noun + verb + determiner + object | The boy ran the long race. *(wait — adj at L12)* |
| 4 | adjective + noun + verb + object | The tall boy ran the race. |
| 5 | determiner + noun + verb + adjective + object | The boy ran the long race. |
| 6 | determiner + noun + verb + object + adverb (how) | The boy ran the race quickly. |
| 7 | determiner + noun + verb + object + adverb (when) | The boy ran the race yesterday. |
| 8 | adverb + , + determiner + noun + verb + object | Yesterday, the boy ran the race. *(fronted — wait, L25)* |
| 8 | helping verb + noun + verb + object? | Did the boy run the race? *(question — L18)* |

The system generates the correct chain based on exactly which lessons are unlocked. The teacher also sees the chain before the session and can adjust any step.

**Example: Pupil who has completed up to L30 (Compound/Complex)**

Chain adds: compound sentences (FANBOYS), subordinate clauses (when/because/although/if), relative clauses, fronted adverbials. Chain length: 10–12 steps. Final sentence may be a multi-clause construction.

---

## Adaptation (Natural Differentiation)

There are no year-group gates and no fixed timelines. Pupils advance through the formula chain based entirely on demonstrated mastery of each formula element. A capable Y3 pupil may have a chain length of 8. A pupil who needs more time at Y5 may still be consolidating compound sentences at chain length 6.

The teacher can see every pupil's current chain length and formula position in the dashboard. They can manually accelerate or slow any pupil without system restrictions.

The weekly subject theme provides a common anchor for the class, but the chain length — and therefore the complexity of each pupil's sentence evolution — varies naturally with the individual.

---

## Session Summary: What the Teacher Sees

For each completed session, the teacher sees:

- **Subject noun** used
- **Each formula step**: the formula instruction + the pupil's sentence
- **AI feedback** at each step (pass / needs revision / explanation)
- **The paragraph** (Lead + Support + Close) with AI assessment
- **Mastery quiz results** (if a quiz was presented this session)
- **Chain length** at start and end of session
- Option to **add teacher comment** on any sentence or on the paragraph as a whole

---

## What This Replaces

The existing PWP Studio (67 levels, one sentence per session, no sentence evolution, no paragraph phase) is retired. The new system builds on the correct pedagogical intent from the start.

The PWP Chain tab (daily tracking, weekly theme, subject noun) is preserved and extended — it becomes the session log for this new model.

---

## Architectural Decisions (Confirmed)

All five foundational design questions have been resolved. These answers are final and govern the build.

---

### 1. Formula Chain — Teacher Control

**Decision: Full teacher control, with auto-generation as the default.**

The system auto-generates a formula chain from the pupil's curriculum position. The teacher can:
- Accept the auto-generated chain as-is
- Adjust any step (reorder, replace, remove)
- Build a completely custom chain from scratch, selecting formula elements in any order

This gives teachers the flexibility to respond to what they have just taught in class, even if the curriculum tracker hasn't been updated yet. Teacher judgement always takes precedence over the system.

---

### 2. Session Trigger — How Sessions Start

**Decision: Every session starts from Formula 1 — the simplest formula available to that pupil.**

"Formula 1" is not a fixed formula. It is relative to each pupil's development. For a pupil who knows only nouns and verbs, Formula 1 is `noun + verb`. For a pupil who has mastered up to compound sentences, Formula 1 might be `subject + verb + object` — since simpler structures are already internalised.

The session always runs the full chain from that pupil's personal Formula 1 to their current ceiling formula. This means every session is a complete rehearsal of everything the pupil knows, building each time to the most complex sentence they can write.

Pupils can begin a session whenever they log in to the PWP app. The teacher does not need to "open" a session — the system always knows the pupil's chain based on their curriculum position and mastery record.

---

### 3. Mastery Quiz — Timing

**Decision: The mastery quiz runs at the end of each session.**

After the pupil completes their formula chain and paragraph, a short quiz tests their control of the formula elements practised in that session. The AI presents targeted formula prompts — varying tense, subject type, verb type (including phrasal verbs like "is dancing"), and sentence purpose — and the pupil constructs sentences for each.

The quiz result gives the teacher and system a clear picture of what the pupil has genuinely internalised, not just correctly copied in a scaffolded chain. A consistently strong quiz performance across sessions triggers the readiness flag for the next formula element to be added to the chain.

---

### 4. Paragraph Before L26 — Early Paragraph Extension

**Decision: A guided/scaffolded paragraph mode is available for pupils who are ready, before L26.**

The paragraph is not strictly locked until L26. For early-developing pupils who show readiness, a lighter scaffolded version is offered:
- **Scaffold**: The pupil is shown a model paragraph structure (topic sentence + 1 support + close) with sentence starters or prompts
- **Guided mode**: The system provides more explicit instructions at each paragraph step
- **Independent mode**: Activated at L26 and beyond — no scaffold, just the constraint on the closing sentence

This is one of WriFe's unique extension opportunities. Pupils who are ready are not held back by the class curriculum position. The teacher can activate the scaffolded paragraph for individual pupils at any point.

---

### 5. Subject Noun and Genre — Expanding the Subject

**Decision: Subject variety is built in from the start; genre direction is added as pupils advance.**

**At all stages:** The system occasionally prompts pupils to choose a subject that is not a person — an animal, an object, a place, a concept. This prevents the habit of always writing about "Sam" or "my friend" and builds the pupil's ability to write about the world broadly. The weekly teacher theme can specify a subject type (e.g., "this week: choose an animal").

**As pupils advance through L52–62 (genre writing):** The paragraph phase gains an optional genre direction. The teacher (or system) can specify a genre frame for the paragraph — for example:
- *"Use your sentence to begin a 'hero's return' story"*
- *"Write your paragraph as a news report opening"*
- *"Use your sentence to open a persuasive argument"*

This connects the formula chain to the text-type work happening in class, making PWP a direct extension of the lesson rather than an isolated activity.

---

## Complete Session Flow (Confirmed)

```
SESSION START
│
├── Subject noun chosen (pupil choice or teacher theme)
│   └── System occasionally prompts: "choose something that is not a person"
│
├── FORMULA CHAIN (Layer 1)
│   ├── Step 1: Formula 1 for this pupil → write sentence → AI assesses
│   ├── Step 2: Next formula → view previous sentence → write new sentence → AI assesses
│   ├── ...
│   └── Step N: Most complex formula → final sentence (becomes topic sentence / Lead)
│
├── PARAGRAPH (Layer 2)  [available from L26, or scaffolded earlier for ready pupils]
│   ├── Lead: final formula sentence (pre-filled, pupil uses as topic sentence)
│   ├── Support: 2–3 free sentences (no formula constraint)
│   └── Close: one sentence — AI checks it is more technically complex than support sentences
│       └── [Optional] Genre direction: "write this as a [genre] opening"
│
├── MASTERY QUIZ (Layer 3)
│   ├── AI presents formula prompts varying: tense, subject type, verb type, sentence purpose
│   ├── Pupil constructs sentences for each prompt
│   ├── AI assesses and records results
│   └── Strong performance → readiness flag for next formula element
│
SESSION END
│
└── Teacher dashboard shows:
    ├── Subject noun used
    ├── Each formula step + sentence + AI feedback
    ├── Paragraph (Lead + Support + Close) + AI assessment
    ├── Quiz results
    └── [Teacher comment field]
```

---

## What This Replaces

The existing PWP Studio (67 levels, one sentence per session, no sentence evolution, no paragraph phase) is retired. The PWP Chain tab concept (daily tracking, weekly theme, subject noun) is preserved and extended — it becomes the session log and class overview for this new model.

---

*This framework is the definitive reference for all PWP development.*
*Version history: v1.0 initial framework | v1.1 all architectural decisions confirmed*
