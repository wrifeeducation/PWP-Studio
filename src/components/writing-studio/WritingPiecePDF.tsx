/**
 * WF-033: PDF export for writing pieces using @react-pdf/renderer.
 * Renders a clean, printable document with header, title, body, and footer.
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { WritingPiece, AIAssessment } from '../../types/index'

// Register font (use built-in Helvetica — no font files needed)

const BAND_LABELS = ['Pre-Emergent', 'Working Towards', 'Expected', 'Greater Depth']

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: '#1E293B',
    paddingTop: 48,
    paddingBottom: 48,
    paddingLeft: 60,
    paddingRight: 60,
    lineHeight: 1.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderBottomStyle: 'solid',
  },
  logo: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#2563EB',
    letterSpacing: 1,
  },
  headerRight: {
    textAlign: 'right',
  },
  headerMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
    marginBottom: 6,
    marginTop: 4,
  },
  genreChip: {
    fontSize: 9,
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  body: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 1.75,
    marginBottom: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 60,
    right: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderTopStyle: 'solid',
  },
  footerText: {
    fontSize: 9,
    color: '#64748B',
  },
})

interface WritingPiecePDFProps {
  piece: WritingPiece
  assessment?: AIAssessment
  pupilName: string
}

export const WritingPiecePDF: React.FC<WritingPiecePDFProps> = ({
  piece,
  assessment,
  pupilName,
}) => {
  const promptTitle = piece.task_prompt_text.split(' ').slice(0, 10).join(' ')
  const genreLabel = piece.genre.replace(/_/g, '-')
  const publishedDate = piece.published_at
    ? new Date(piece.published_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB')

  const bandLabel =
    assessment?.overall_band != null
      ? BAND_LABELS[assessment.overall_band]
      : null

  // Strip HTML tags from full_text for PDF
  const plainText = piece.full_text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  return (
    <Document
      title={`WriFe — ${pupilName} — ${promptTitle}`}
      author="WriFe Platform"
      subject="Writing Portfolio"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <Text style={styles.logo}>WriFe</Text>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1E293B' }}>
              {pupilName}
            </Text>
            <Text style={styles.headerMeta}>{publishedDate}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{promptTitle}</Text>

        {/* Genre chip */}
        <Text style={styles.genreChip}>{genreLabel.toUpperCase()}</Text>

        {/* Body text */}
        <Text style={styles.body}>{plainText}</Text>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {piece.word_count} words · {genreLabel}
            {bandLabel ? ` · ${bandLabel}` : ''}
          </Text>
          <Text style={styles.footerText}>WriFe Writing Portfolio</Text>
        </View>
      </Page>
    </Document>
  )
}
