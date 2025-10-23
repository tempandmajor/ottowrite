/**
 * Legal Document Page
 *
 * Displays individual legal documents (Terms, Privacy, IP Protection, Partner Terms)
 */

import { notFound } from 'next/navigation'
import { getLegalDocumentByType, type LegalDocument } from '@/lib/submissions/legal-documents'

interface PageProps {
  params: Promise<{
    type: string
  }>
}

export default async function LegalDocumentPage({ params }: PageProps) {
  const { type } = await params

  const validTypes: LegalDocument['type'][] = ['terms', 'privacy', 'ip-protection', 'partner-terms']

  if (!validTypes.includes(type as LegalDocument['type'])) {
    notFound()
  }

  const document = getLegalDocumentByType(type as LegalDocument['type'])

  if (!document) {
    notFound()
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{document.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Version {document.version}</span>
          <span>•</span>
          <span>Effective Date: {document.effectiveDate}</span>
          <span>•</span>
          <span>Last Updated: {document.lastUpdated}</span>
        </div>
      </div>

      <div className="prose prose-lg max-w-none dark:prose-invert">
        <div
          dangerouslySetInnerHTML={{
            __html: document.content
              .split('\n')
              .map((line) => {
                // Convert markdown-style headers
                if (line.startsWith('# ')) {
                  return `<h1>${line.substring(2)}</h1>`
                }
                if (line.startsWith('## ')) {
                  return `<h2>${line.substring(3)}</h2>`
                }
                if (line.startsWith('### ')) {
                  return `<h3>${line.substring(4)}</h3>`
                }
                if (line.startsWith('#### ')) {
                  return `<h4>${line.substring(5)}</h4>`
                }
                // Convert bold
                line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                // Convert italic
                line = line.replace(/\*(.*?)\*/g, '<em>$1</em>')
                // Convert links
                line = line.replace(
                  /\[([^\]]+)\]\(([^)]+)\)/g,
                  '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
                )
                // Convert checkmarks
                line = line.replace(/✓/g, '<span class="text-green-600">✓</span>')
                // Empty lines become paragraph breaks
                if (line.trim() === '') {
                  return '<br />'
                }
                return `<p>${line}</p>`
              })
              .join('\n'),
          }}
        />
      </div>

      <div className="mt-8 pt-8 border-t">
        <p className="text-sm text-muted-foreground">
          For questions about this document, please contact us at{' '}
          <a
            href="mailto:legal@ottowrite.com"
            className="text-primary hover:underline"
          >
            legal@ottowrite.com
          </a>
        </p>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { type } = await params
  const document = getLegalDocumentByType(type as LegalDocument['type'])

  if (!document) {
    return {
      title: 'Document Not Found',
    }
  }

  return {
    title: document.title,
    description: `${document.title} - Version ${document.version}, effective ${document.effectiveDate}`,
  }
}

export async function generateStaticParams() {
  return [
    { type: 'terms' },
    { type: 'privacy' },
    { type: 'ip-protection' },
    { type: 'partner-terms' },
  ]
}
