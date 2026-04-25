/**
 * WF-015 — WrifeEditor
 * Tiptap rich-text editor wrapper for Writing Studio.
 * Toolbar: Bold, Italic, Paragraph, Heading 2, Bullet list (minimal for children).
 * Exposes plain text (for AI assessment) and HTML (for display/saving).
 */

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'

export interface WrifeEditorProps {
  /** Initial HTML content */
  initialContent?: string
  /** Called whenever content changes */
  onChange: (html: string, plainText: string, wordCount: number) => void
  /** Minimum words before submit is enabled (default 50) */
  minWords?: number
  /** Whether editor is read-only */
  readOnly?: boolean
}

/** Count words in a plain-text string */
const countWords = (text: string): number =>
  text.trim() === '' ? 0 : text.trim().split(/\s+/).length

export const WrifeEditor = ({
  initialContent = '',
  onChange,
  minWords = 50,
  readOnly = false,
}: WrifeEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        codeBlock: false,
        blockquote: false,
        code: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: 'Start writing here…',
      }),
      CharacterCount,
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      const plain = ed.getText()
      const wc = countWords(plain)
      onChange(html, plain, wc)
    },
  })

  const wordCount = editor ? countWords(editor.getText()) : 0
  const charCount = editor ? (editor.storage as { characterCount: { characters: () => number } }).characterCount.characters() : 0
  const meetsMinimum = wordCount >= minWords

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
      data-testid="writing-editor"
      data-tts="editor-area"
    >
      {/* Toolbar */}
      {!readOnly && (
        <div
          className="flex items-center gap-1 px-3 py-2 flex-wrap"
          style={{
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-background)',
          }}
          data-testid="editor-toolbar"
        >
          <ToolbarButton
            label="Bold"
            active={editor?.isActive('bold') ?? false}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </ToolbarButton>

          <ToolbarButton
            label="Italic"
            active={editor?.isActive('italic') ?? false}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </ToolbarButton>

          <div
            className="w-px h-5 mx-1"
            style={{ backgroundColor: 'var(--color-border)' }}
            aria-hidden="true"
          />

          <ToolbarButton
            label="Paragraph"
            active={editor?.isActive('paragraph') ?? false}
            onClick={() => editor?.chain().focus().setParagraph().run()}
            title="Normal paragraph"
          >
            ¶
          </ToolbarButton>

          <ToolbarButton
            label="Heading"
            active={editor?.isActive('heading', { level: 2 }) ?? false}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading"
          >
            H2
          </ToolbarButton>

          <ToolbarButton
            label="Bullet list"
            active={editor?.isActive('bulletList') ?? false}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            • List
          </ToolbarButton>
        </div>
      )}

      {/* Editor area */}
      <div
        className="px-4 py-3 flex-1"
        style={{ minHeight: '320px' }}
      >
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none focus:outline-none min-h-[300px]"
          style={{ color: 'var(--color-text)', lineHeight: '1.7', fontSize: '1rem' }}
        />
      </div>

      {/* Character / word count bar */}
      <div
        className="flex items-center justify-between px-4 py-2 text-xs"
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-background)',
          color: meetsMinimum ? 'var(--color-text-muted)' : '#DC2626',
        }}
        data-testid="word-count-bar"
      >
        <span data-tts={`${wordCount} words, ${charCount} characters`}>
          {wordCount} words · {charCount} characters
        </span>
        {!meetsMinimum && (
          <span
            className="font-medium"
            data-tts={`Minimum ${minWords} words required`}
          >
            Minimum {minWords} words to submit
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Internal toolbar button ──────────────────────────────────────────────────

interface ToolbarButtonProps {
  label: string
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}

const ToolbarButton = ({ label, active, onClick, title, children }: ToolbarButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={label}
    aria-pressed={active}
    data-testid={`toolbar-${label.toLowerCase().replace(/\s+/g, '-')}`}
    className="px-2 py-1 rounded text-sm font-medium transition-colors min-w-[32px] min-h-[32px]"
    style={{
      backgroundColor: active ? 'var(--color-brand-primary)' : 'transparent',
      color: active ? '#fff' : 'var(--color-text)',
      border: active ? 'none' : '1px solid var(--color-border)',
    }}
  >
    {children}
  </button>
)
