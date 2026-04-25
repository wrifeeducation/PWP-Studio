# WriFe Design System & Component Specifications

## Colour System

### Primary Palette (Platform UI)

| Token | Hex | RGB | Tailwind Alias | Use Case |
|-------|-----|-----|-----------------|----------|
| **Navy** | `#1B3A6B` | 27, 58, 107 | `navy-900` | App header, primary buttons, main navigation |
| **Accent Blue** | `#2E75B6` | 46, 117, 182 | `blue-600` | Secondary buttons, links, interactive states |
| **Paragraph Green** | `#4A7C59` | 74, 124, 89 | `green-700` | Paragraph section, completion states |
| **Light Background** | `#FAFAFA` | 250, 250, 250 | `gray-50` | Page background, card backgrounds |
| **Surface** | `#FFFFFF` | 255, 255, 255 | `white` | Card backgrounds, modal backgrounds |
| **Text Primary** | `#212121` | 33, 33, 33 | `gray-900` | Body text, headings |
| **Text Secondary** | `#616161` | 97, 97, 97 | `gray-600` | Labels, hints, metadata |

### Word Class Colour System (Grammar Tags)

Used consistently across all three learning layers for visual language learning.

| Word Class | Hex | RGB | Tailwind Alias | Mnemonic |
|------------|-----|-----|-----------------|----------|
| **Determiner** | `#7C3AED` | 124, 58, 237 | `purple-600` | Royal purple = "limits" (the, a) |
| **Adjective** | `#16A34A` | 22, 163, 74 | `green-600` | Green = "growing" (big, red, happy) |
| **Noun** | `#2563EB` | 37, 99, 235 | `blue-600` | Blue = "basic" person/place/thing |
| **Verb** | `#DC2626` | 220, 38, 38 | `red-600` | Red = "running" (action) |
| **Adverb** | `#EA580C` | 234, 88, 12 | `orange-600` | Orange = "often" (modifies verbs) |
| **Preposition** | `#92400E` | 146, 64, 14 | `amber-900` | Brown = "between" (spatial) |
| **Pronoun** | `#DB2777` | 219, 39, 119 | `pink-600` | Pink = "person" replacement |
| **Conjunction** | `#CA8A04` | 202, 138, 4 | `yellow-600` | Yellow = "joining" (and, but, or) |

### Feedback Colours

| State | Hex | Use Case |
|-------|-----|----------|
| **Correct (Green)** | `#16A34A` | Formula submission correct, assessment pass |
| **Incorrect (Red)** | `#DC2626` | Formula submission incorrect, validation error |
| **Pending (Blue)** | `#2E75B6` | Assessment in progress, autosave queued |
| **Warning (Orange)** | `#EA580C` | Offline mode, sync pending |
| **Success (Green)** | `#16A34A` | XP earned, badge unlocked, level completed |

### Tailwind Config (Custom Tokens)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    colors: {
      // Extend default palette with custom WriFe tokens
      navy: {
        900: '#1B3A6B',
      },
      'accent-blue': '#2E75B6',
      'paragraph-green': '#4A7C59',
      
      // Word class colours (shadow with opacity variants)
      purple: {
        600: '#7C3AED', // Determiner
      },
      green: {
        600: '#16A34A', // Adjective
        700: '#4A7C59', // Paragraph Green
      },
      blue: {
        600: '#2563EB', // Noun
      },
      red: {
        600: '#DC2626', // Verb
      },
      orange: {
        600: '#EA580C', // Adverb
      },
      amber: {
        900: '#92400E', // Preposition
      },
      pink: {
        600: '#DB2777', // Pronoun
      },
      yellow: {
        600: '#CA8A04', // Conjunction
      },
      
      // Semantic aliases
      'correct': '#16A34A',
      'incorrect': '#DC2626',
      'pending': '#2E75B6',
      'warning': '#EA580C',
    },
    extend: {
      backgroundColor: {
        'light-bg': '#FAFAFA',
      },
      textColor: {
        'primary': '#212121',
        'secondary': '#616161',
      },
    },
  },
}
```

---

## Typography Scale

### Font Stack

```css
/* Global in globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Scale (based on 16px = 1rem)

| Name | Size | Line Height | Weight | Use Case |
|------|------|-------------|--------|----------|
| **Heading H1** | 32px (2rem) | 40px (1.25) | 700 | Page titles (WritingStudioPage h1) |
| **Heading H2** | 24px (1.5rem) | 32px (1.33) | 600 | Section titles (Paragraph phases, formulas) |
| **Heading H3** | 20px (1.25rem) | 28px (1.4) | 600 | Subsection titles (XP counter, badge unlock) |
| **Heading H4** | 18px (1.125rem) | 24px (1.33) | 600 | Component headings (FormulaBuilder title) |
| **Body Regular** | 16px (1rem) | 24px (1.5) | 400 | Main content, feedback text |
| **Body Small** | 14px (0.875rem) | 20px (1.43) | 400 | Labels, hints, metadata |
| **Mono (Code)** | 14px (0.875rem) | 20px (1.43) | 500 | Formula slots, word class names |
| **Button** | 16px (1rem) | 24px (1.5) | 600 | Buttons, CTAs |

### Tailwind Typography Config

```javascript
// tailwind.config.js (extend)
extend: {
  fontSize: {
    'h1': ['2rem', { lineHeight: '1.25', fontWeight: '700' }],
    'h2': ['1.5rem', { lineHeight: '1.33', fontWeight: '600' }],
    'h3': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
    'h4': ['1.125rem', { lineHeight: '1.33', fontWeight: '600' }],
    'body': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
    'body-sm': ['0.875rem', { lineHeight: '1.43', fontWeight: '400' }],
    'mono': ['0.875rem', { lineHeight: '1.43', fontWeight: '500' }],
    'button': ['1rem', { lineHeight: '1.5', fontWeight: '600' }],
  },
}
```

---

## Spacing & Layout Grid

### Spacing Scale (8px base unit)

```
0 = 0
1 = 4px (0.25rem)
2 = 8px (0.5rem)
3 = 12px (0.75rem)
4 = 16px (1rem)
5 = 20px (1.25rem)
6 = 24px (1.5rem)
8 = 32px (2rem)
10 = 40px (2.5rem)
12 = 48px (3rem)
16 = 64px (4rem)
20 = 80px (5rem)
```

**Example Tailwind classes:**
```tsx
<div className="px-4 py-6">        {/* 16px horizontal, 24px vertical padding */}
  <button className="mb-2">Check</button>  {/* 8px margin-bottom */}
</div>
```

### Layout Grid

**Container widths (Tailwind defaults extended):**
```
sm: 480px    (mobile)
md: 768px    (tablet portrait)
lg: 1024px   (tablet landscape / desktop)
xl: 1280px   (desktop large)
2xl: 1536px  (desktop extra-large)
```

**Card/container layout:**
- **Mobile:** full width with 16px (4) horizontal padding
- **Tablet (md):** max-width 640px, centered
- **Desktop (lg+):** max-width 1024px, centered

---

## Component Specifications

### 1. Word Class Tile (Draggable)

**Purpose:** Draggable grammar element in Formula Practice.

**Dimensions:**
- Width: 80–100px (flex-based, responsive)
- Height: 48px
- Border radius: 8px
- Padding: 8px 12px

**States:**

| State | Background | Border | Text | Opacity | Cursor |
|-------|------------|--------|------|---------|--------|
| **Idle** | Word class colour (e.g., purple for Determiner) | 2px solid word class colour | White text, bold | 1.0 | grab |
| **Dragging** | Word class colour | 2px solid white | White text | 0.8 | grabbing |
| **Placed (Correct)** | Word class colour | 2px solid green (#16A34A) | White text | 1.0 | default |
| **Placed (Incorrect)** | Word class colour | 2px dashed red (#DC2626) | White text | 0.8 | default |
| **Disabled** | Gray (#9CA3AF) | 2px solid gray | Gray text | 0.5 | not-allowed |

**Typography:**
- Font: Inter 600 (bold)
- Size: 14px (mono-style, Tailwind `font-mono`)
- Alignment: center

**Example Component:**
```tsx
export const WordClassTile: React.FC<WordClassTileProps> = ({
  wordClass,
  word,
  onDragStart,
  state = 'idle',
  dataTestId
}) => {
  const colourMap = {
    determiner: '#7C3AED',
    adjective: '#16A34A',
    noun: '#2563EB',
    verb: '#DC2626',
    adverb: '#EA580C',
    preposition: '#92400E',
    pronoun: '#DB2777',
    conjunction: '#CA8A04',
  }

  const stateClasses = {
    idle: 'opacity-100 cursor-grab',
    dragging: 'opacity-80 cursor-grabbing',
    placed_correct: 'border-green-600',
    placed_incorrect: 'border-dashed border-red-600 opacity-80',
    disabled: 'bg-gray-300 opacity-50 cursor-not-allowed',
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      data-testid={dataTestId}
      data-tts={`${wordClass} tile: ${word}`}
      className={`
        w-24 h-12 rounded-lg px-3 py-2
        text-white font-mono font-bold text-sm
        text-center
        select-none user-select-none
        transition-all duration-150
        ${stateClasses[state]}
      `}
      style={{
        backgroundColor: colourMap[wordClass.toLowerCase()],
      }}
    >
      {word}
    </div>
  )
}
```

---

### 2. Formula Slot (Drop Target)

**Purpose:** Drop target for word class tiles in Formula Practice.

**Dimensions:**
- Width: 80–100px (match tile width)
- Height: 48px
- Border radius: 8px
- Padding: 8px 12px

**States:**

| State | Background | Border | Icon | Opacity |
|-------|------------|--------|------|---------|
| **Empty** | #F3F4F6 (gray-100) | 2px dashed #D1D5DB (gray-300) | + icon (light gray) | 1.0 |
| **Hover (empty)** | #E5E7EB (gray-200) | 2px dashed #9CA3AF (gray-400) | + icon (darker) | 1.0 |
| **Occupied (valid)** | Tile colour | 2px solid word class colour | — | 1.0 |
| **Occupied (invalid)** | Word class colour | 2px dashed #DC2626 (red) | ⚠ icon | 0.8 |
| **Locked** | #D1D5DB (gray-300) | 2px solid #9CA3AF (gray-400) | 🔒 icon | 0.5 |

**Drag Feedback:**
- Border glow (shadow) when drag-over: `box-shadow: 0 0 0 3px rgba(46, 117, 182, 0.3)`
- Background brightens on drag-over

**Example Component:**
```tsx
export const FormulaSlot: React.FC<FormulaSlotProps> = ({
  index,
  wordClass,
  currentTile,
  isCorrect,
  isLocked,
  onDrop,
  dataTestId
}) => {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const tileData = e.dataTransfer.getData('text/plain')
    onDrop(tileData, index)
  }

  const stateClasses = {
    empty: 'bg-gray-100 border-dashed border-gray-300 hover:bg-gray-200 hover:border-gray-400',
    occupied_valid: 'bg-current border-solid',
    occupied_invalid: 'bg-current border-dashed border-red-600 opacity-80',
    locked: 'bg-gray-300 border-solid border-gray-400 opacity-50 cursor-not-allowed',
    dragover: 'ring-2 ring-offset-0 ring-blue-400',
  }

  const getState = () => {
    if (isLocked) return 'locked'
    if (!currentTile) return 'empty'
    if (isCorrect) return 'occupied_valid'
    return 'occupied_invalid'
  }

  const state = getState()
  const baseClass = stateClasses[state]
  const dragoverClass = isDragOver && !isLocked ? stateClasses.dragover : ''

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={dataTestId}
      data-tts={`${wordClass} slot`}
      className={`
        w-24 h-12 rounded-lg px-3 py-2
        flex items-center justify-center
        border-2 transition-all duration-150
        ${baseClass}
        ${dragoverClass}
      `}
    >
      {currentTile ? (
        <span className="font-mono font-bold text-sm">{currentTile}</span>
      ) : (
        <span className="text-xl text-gray-400">+</span>
      )}
    </div>
  )
}
```

---

### 3. Paragraph Frame (LSC Scaffold)

**Purpose:** Display Lead-Support-Close structure in Paragraph Builder.

**Layout:** Three vertical sections, each with visual phase indicators.

**Dimensions:**
- Full width (responsive)
- Sections: stacked vertically on mobile (sm), flex row on tablet+ (md)
- Each section: min-height 120px, padding 16px

**Phase Styles:**

| Phase | Colour | Icon | Label | Position |
|-------|--------|------|-------|----------|
| **A (Lead)** | #4A7C59 (paragraph green) | → | "Lead" | Top / left badge |
| **B (Support)** | #2E75B6 (accent blue) | ↳ | "Support" | Middle / left badge |
| **C (Close)** | #1B3A6B (navy) | ⟲ | "Close" | Bottom / left badge |

**State Transitions:**

| Phase | Input State | Visual Feedback |
|-------|------------|-----------------|
| **A** | empty | Gray border, placeholder "Introduce the topic..." |
| **A** | filled | Green left border (2px), text visible |
| **B** | locked (until A complete) | Gray background, "Complete Lead first" message |
| **B** | unlocked | Blue border, rich text editor active |
| **B** | filled | Blue left border (3px), character count badge |
| **C** | locked (until B complete) | Gray background |
| **C** | unlocked | Navy border, text input active |
| **C** | filled | Navy left border (3px) |

**Live Preview:** Renders full paragraph as user types, with phase sections highlighted.

**Example Component Structure:**
```tsx
export const ParagraphPhaseA: React.FC<ParagraphPhaseAProps> = ({
  value,
  onChange,
  isComplete,
  dataTestId
}) => {
  return (
    <div className={`
      relative p-4 rounded-lg border-l-4 border-paragraph-green
      bg-white transition-colors duration-150
      ${isComplete ? 'border-paragraph-green bg-green-50' : 'border-gray-300'}
    `}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">→</span>
        <label className="font-600 text-paragraph-green">Lead</label>
      </div>
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={dataTestId}
        data-tts="Lead sentence input"
        placeholder="Introduce your topic. What is this paragraph about?"
        maxLength={100}
        className="w-full p-3 border rounded-lg font-body text-body resize-none"
      />
      
      <div className="text-sm text-secondary mt-2">
        {value.length}/100 characters
      </div>
    </div>
  )
}
```

---

### 4. Assessment Result Card

**Purpose:** Display feedback from AI assessment (formula, paragraph, or writing).

**Layout:** Vertical stack, expandable sections for detail.

**Sections:**

1. **Header (Score + Grade)**
   - Large score (e.g., "85%") in color (green if correct, red if incorrect)
   - Grade letter (A–F for writing studio)
   - Timestamp

2. **Feedback Summary**
   - 1–2 lines of key feedback (e.g., "Great! Your sentence follows the pattern.")

3. **Detail Breakdown** (formula)
   - Word classes identified (list)
   - Grammar issues (if any)

4. **Detail Breakdown** (paragraph)
   - Cohesion score bar
   - Vocabulary score bar
   - Genre fit status

5. **Detail Breakdown** (writing)
   - Rubric scores (8–10 criteria)
   - Strengths (bulleted)
   - Areas for improvement (bulleted)
   - Next steps (narrative)

**Example Component:**
```tsx
export const AssessmentResult: React.FC<AssessmentResultProps> = ({
  result,
  type = 'formula' // 'formula' | 'paragraph' | 'writing'
}) => {
  const isCorrect = result.score >= 80

  return (
    <div className="bg-white rounded-lg p-6 border-t-4 border-accent-blue">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className={`text-5xl font-bold ${isCorrect ? 'text-correct' : 'text-incorrect'}`}>
            {result.score}%
          </div>
          <p className="text-secondary text-sm">{result.feedback}</p>
        </div>
        <div data-testid="assessment-timestamp" className="text-xs text-secondary">
          {new Date(result.created_at).toLocaleTimeString()}
        </div>
      </div>

      {/* Type-specific details */}
      {type === 'formula' && (
        <div className="mt-4 space-y-2">
          <p className="font-600 text-primary">Word Classes:</p>
          <div className="flex gap-2 flex-wrap">
            {result.details.wordClasses.map((wc) => (
              <span key={wc} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                {wc}
              </span>
            ))}
          </div>
          {result.details.grammarIssues.length > 0 && (
            <>
              <p className="font-600 text-incorrect mt-4">Grammar Issues:</p>
              <ul className="list-disc list-inside text-sm text-secondary space-y-1">
                {result.details.grammarIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* More sections for paragraph/writing... */}
    </div>
  )
}
```

---

### 5. XP Counter Animation

**Purpose:** Celebrate correct submission with animated XP gain.

**Animation Sequence:**
1. **Appear:** Counter springs in from bottom-right (Framer Motion)
2. **Float:** Counter moves upward, opacity fades
3. **Disappear:** Fades out after 2s

**Visual:**
- Size: 48px × 48px (large)
- Icon: "+100 XP" or similar
- Colour: Gold/yellow (#CA8A04)
- Font: Bold, large text
- Position: Bottom-right corner

**Example Component:**
```tsx
import { motion } from 'framer-motion'

export const XPCounter: React.FC<XPCounterProps> = ({ xpAmount = 100 }) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0, scale: 0.8 }}
      animate={{ y: -100, opacity: 0, scale: 1.2 }}
      transition={{ duration: 2, ease: 'easeOut' }}
      className="fixed bottom-20 right-8 pointer-events-none"
    >
      <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full font-bold text-lg shadow-lg">
        <span>+{xpAmount}</span>
        <span>⭐</span>
      </div>
    </motion.div>
  )
}
```

---

### 6. Badge Reveal Animation

**Purpose:** Show badge unlocked on milestone (e.g., "First Formula Correct", "Level 10 Unlocked").

**Animation Sequence:**
1. **Scale in:** 0 → 1 with spring easing (Framer Motion)
2. **Bounce:** Slight overshoot on scale
3. **Glow:** Subtle shadow pulse, then fade

**Visual:**
- Size: 128px × 128px (large)
- Background: Circular, with gradient (e.g., gold to orange)
- Icon/Text: Badge name centered
- Shadow: Drop shadow + glow ring
- Modal: Full-screen overlay (semi-transparent dark) behind badge

**Example Component:**
```tsx
export const BadgeReveal: React.FC<BadgeRevealProps> = ({ badge, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="text-center"
      >
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl mx-auto mb-4">
          <span className="text-6xl">{badge.icon}</span>
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">{badge.name}</h2>
        <p className="text-secondary text-sm max-w-xs">{badge.description}</p>
      </motion.div>
    </motion.div>
  )
}
```

---

### 7. Streak Meter

**Purpose:** Display current daily streak and motivate continued engagement.

**Layout:** Horizontal bar with calendar-like day indicators.

**Visual:**
- Background: Light gray (#F3F4F6)
- Filled portion: Paragraph green (#4A7C59)
- Day circles: 24px diameter, 4px border
- Current day: Green, solid fill
- Completed day: Green, checkmark icon
- Missed day: Gray, empty
- Future day: Gray, disabled

**Dimensions:**
- Height: 48px
- Width: full width (responsive)
- Padding: 8px

**Example Component:**
```tsx
export const StreakMeter: React.FC<StreakMeterProps> = ({ streakCount, daysSinceStart }) => {
  const days = Array(7).fill(null).map((_, i) => i + 1)

  return (
    <div className="bg-light-bg rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-600 text-primary">Daily Streak</h3>
        <span className="text-2xl font-bold text-paragraph-green">{streakCount} 🔥</span>
      </div>

      <div className="flex gap-2">
        {days.map((day) => {
          const isCompleted = day <= streakCount
          const isCurrent = day === streakCount

          return (
            <div
              key={day}
              className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center
                transition-all duration-200
                ${isCompleted && !isCurrent ? 'bg-paragraph-green border-paragraph-green' : ''}
                ${isCurrent ? 'bg-paragraph-green border-paragraph-green ring-2 ring-green-300' : ''}
                ${!isCompleted ? 'bg-gray-200 border-gray-300' : ''}
              `}
              data-tts={`Day ${day}${isCompleted ? ' completed' : ''}`}
            >
              {isCompleted && <span className="text-white text-xs font-bold">✓</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

### 8. Rich Text Editor (ProseMirror/tiptap)

**Purpose:** Support extended writing in Writing Studio with formatting (bold, italic, list, etc.).

**UI Toolbar:**
- Bold, Italic, Underline buttons
- Heading, Paragraph dropdowns
- Bullet list, Ordered list buttons
- Undo, Redo buttons
- Word count display (bottom-right)

**Editor Area:**
- White background, 16px padding
- 1px border (gray-300)
- Minimum height: 400px
- Font: Inter 16px, line-height 1.5
- Placeholder: "Start writing your essay..."

**Constraints:**
- Maximum word count: 700 (enforced via validation, not input attribute)
- Spell-check: enabled (browser native)

**Example Component:**
```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export const WritingEditor: React.FC<WritingEditorProps> = ({
  content,
  onChange,
  maxWords = 700
}) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      const text = editor.getText()
      const wordCount = text.split(/\s+/).filter(Boolean).length
      if (wordCount <= maxWords) {
        onChange(editor.getHTML())
      }
    },
  })

  const wordCount = editor ? editor.getText().split(/\s+/).filter(Boolean).length : 0

  return (
    <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-gray-300 bg-gray-50 p-2 flex gap-2">
        <button onClick={() => editor?.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </button>
        <button onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          • List
        </button>
        {/* More toolbar buttons... */}
      </div>

      {/* Editor */}
      <div className="p-4">
        <EditorContent editor={editor} data-tts="Writing editor" />
      </div>

      {/* Word Count */}
      <div className="border-t border-gray-300 bg-gray-50 px-4 py-2 text-sm text-secondary text-right">
        {wordCount} / {maxWords} words
      </div>
    </div>
  )
}
```

---

## Animation Conventions (Framer Motion)

### Standard Variants

**Button Hover:**
```typescript
const buttonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
}
```

**Fade In:**
```typescript
const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
}
```

**Slide In (from bottom):**
```typescript
const slideInVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
}
```

**Scale (reveal):**
```typescript
const scaleVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } },
}
```

### Usage Example

```tsx
import { motion } from 'framer-motion'

<motion.button
  variants={buttonVariants}
  initial="rest"
  whileHover="hover"
  whileTap="tap"
>
  Submit
</motion.button>
```

---

## Accessibility Requirements (WCAG 2.1 AA)

### Colour Contrast

| Element | Ratio Required | Example |
|---------|---------------|---------| 
| Normal text (body) | 4.5:1 | Navy (#1B3A6B) text on white = 8.2:1 ✓ |
| Large text (18px+) | 3:1 | Accent blue (#2E75B6) on white = 4.8:1 ✓ |
| UI components (borders, icons) | 3:1 | Navy button border on white = 8.2:1 ✓ |
| Word class tiles | 4.5:1 | White text on purple (#7C3AED) = 5.2:1 ✓ |

**Test:** Use WebAIM Contrast Checker or Lighthouse audit.

### Touch Targets

- **Minimum size:** 44×44px (mobile), 40×40px (tablet+)
- **Spacing:** 8px minimum between targets
- **Apply to:** Buttons, form inputs, draggable tiles, slots

### Keyboard Navigation

- **All interactive elements:** Focusable (tabindex=0 if needed)
- **Focus style:** Visible ring (Tailwind `focus:ring-2 focus:ring-accent-blue`)
- **Enter/Space:** Triggers buttons, checkboxes
- **Arrow keys:** Navigate list items, tabs
- **Escape:** Closes modals, dropdowns

**Example:**
```tsx
<button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleSubmit()
    }
  }}
  className="focus:ring-2 focus:ring-offset-2 focus:ring-accent-blue"
>
  Check Answer
</button>
```

### TTS (Text-to-Speech) Support

**Convention:** All text visible to pupils gets a `data-tts` attribute.

```tsx
<div data-tts="Determiner tile: the">
  <span className="text-purple-600 font-bold">the</span>
</div>

<div data-tts="Lead sentence input">
  <textarea placeholder="..." />
</div>

<button data-tts="Check answer button">Check</button>
```

**Usage in Pupil Interface:**
```typescript
// Global script to enable TTS on demand
window.enableTTS = () => {
  const elements = document.querySelectorAll('[data-tts]')
  elements.forEach((el) => {
    el.addEventListener('click', () => {
      const text = el.getAttribute('data-tts')
      const speech = new SpeechSynthesisUtterance(text)
      speech.lang = 'en-GB'
      window.speechSynthesis.speak(speech)
    })
  })
}
```

### Semantic HTML

- Use `<button>`, `<form>`, `<input>`, `<label>`, `<heading>` correctly
- Avoid `<div onClick>` for interactive elements
- `<label htmlFor={inputId}>` for form fields
- `<fieldset>` for grouped radio/checkbox inputs

### Screen Reader Considerations

- **aria-label** for icon-only buttons
- **aria-describedby** for input hints
- **role="status"** for dynamic feedback (assessment results)
- **aria-live="polite"** for updates (XP counter, autosave status)

**Example:**
```tsx
<button
  onClick={handleSubmit}
  aria-label="Submit formula for assessment"
  className="..."
>
  ✓ Check
</button>

<div
  role="status"
  aria-live="polite"
  aria-describedby="feedback-text"
>
  <div id="feedback-text">✓ Correct! +100 XP</div>
</div>
```

---

## Responsive Breakpoints (Tablet-First)

**Base (Mobile):** < 480px
- Full width layouts
- Single-column stacks
- Larger touch targets (48px+)

**Small (sm):** 480px+
- 2-column grid for some components
- Increased spacing
- Optimized for landscape phone

**Medium (md):** 768px+
- 2-column sidebar layouts
- Teacher dashboard grids
- Larger form inputs

**Large (lg):** 1024px+
- 3-column layouts
- Full dashboard views
- Desktop-optimized components

**Extra Large (xl):** 1280px+
- Widescreen layouts
- Multi-panel views

### Example Responsive Component

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
  {/* 1 col on mobile, 2 on sm, 3 on md and above */}
</div>

<div className="flex flex-col md:flex-row gap-8">
  {/* Stack on mobile, flex row on tablet+ */}
</div>
```

---

## Dark Mode (Future)

**Current:** Light mode only (FAFAFA background).

**Future roadmap:** Dark mode support (planned for Phase 2).

**Preparation (do NOT implement yet):**
- Use Tailwind `dark:` prefix in new components (optional)
- Use CSS custom properties for colour tokens
- Test light-mode only; flag dark-mode tokens for Phase 2

---

## Component Library (shadcn/ui)

**Pre-configured shadcn/ui components available:**
```
Button, Card, Dialog, Dropdown, Form, Input, Label, Modal,
Popover, Select, Separator, Tabs, Textarea, Tooltip, Badge
```

**Installation:**
```bash
npx shadcn-ui@latest add [component-name]
```

**Usage:**
```tsx
import { Button } from '@/components/ui/button'

<Button variant="default" size="lg">
  Submit
</Button>
```

---

## File Structure for Design Assets

```
apps/web/public/
├── assets/
│   ├── formulas/          # SVG illustrations for L1–L67 formulas
│   │   ├── L1.svg
│   │   ├── L2.svg
│   │   └── ...
│   ├── badges/            # Badge unlock graphics
│   │   ├── first-formula.svg
│   │   ├── level-10.svg
│   │   └── ...
│   ├── icons/             # UI icons
│   │   ├── determiner.svg (colour-filled)
│   │   ├── adjective.svg
│   │   └── ...
│   └── illustrations/     # Hero, onboarding illustrations
│       ├── hero.svg
│       └── ...
```

---

## Design Tokens Export (JSON)

**File:** `apps/web/src/styles/tokens.json`

```json
{
  "colors": {
    "primary": {
      "navy": "#1B3A6B",
      "blue": "#2E75B6"
    },
    "wordClasses": {
      "determiner": "#7C3AED",
      "adjective": "#16A34A",
      "noun": "#2563EB",
      "verb": "#DC2626",
      "adverb": "#EA580C",
      "preposition": "#92400E",
      "pronoun": "#DB2777",
      "conjunction": "#CA8A04"
    },
    "feedback": {
      "correct": "#16A34A",
      "incorrect": "#DC2626",
      "pending": "#2E75B6",
      "warning": "#EA580C"
    }
  },
  "typography": {
    "fonts": {
      "sans": "Inter",
      "mono": "JetBrains Mono"
    },
    "sizes": {
      "h1": "2rem",
      "h2": "1.5rem",
      "body": "1rem",
      "body-sm": "0.875rem"
    }
  },
  "spacing": {
    "xs": "0.25rem",
    "sm": "0.5rem",
    "md": "1rem",
    "lg": "1.5rem",
    "xl": "2rem"
  }
}
```

---

## Quality Checklist for New Components

Before committing a new component, verify:

- [ ] Colour tokens used (no hardcoded hex)
- [ ] Tailwind classes only (no inline styles)
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Accessibility: contrast ratio ≥4.5:1
- [ ] Accessibility: touch targets ≥44px
- [ ] Accessibility: keyboard navigation works
- [ ] TTS `data-tts` attributes on pupil-visible text
- [ ] Framer Motion variants (if animated)
- [ ] Focus styles visible
- [ ] WCAG 2.1 AA Lighthouse audit passes
- [ ] shadcn/ui components used where appropriate
- [ ] Component stories in Storybook (future)

---

**Last Updated:** 2025-04-23  
**Design System Version:** 1.0  
**Status:** Production-ready (Light mode)
