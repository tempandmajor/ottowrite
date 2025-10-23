'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { FileText, CheckCircle2, AlertCircle, Download, ExternalLink } from 'lucide-react'
import type { LegalDocument, UserAgreement } from '@/lib/submissions/legal-documents'
import { cn } from '@/lib/utils'

interface LegalDocumentViewerProps {
  document: LegalDocument
  onAgree?: (agreement: Omit<UserAgreement, 'agreedAt' | 'ipAddress' | 'userAgent'>) => void
  onDisagree?: () => void
  existingAgreement?: UserAgreement
  required?: boolean
  className?: string
}

export function LegalDocumentViewer({
  document,
  onAgree,
  onDisagree,
  existingAgreement,
  required = false,
  className,
}: LegalDocumentViewerProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [agreed, setAgreed] = useState(!!existingAgreement)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const scrolledToBottom =
      target.scrollHeight - target.scrollTop <= target.clientHeight + 50

    if (scrolledToBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true)
    }
  }

  const handleAgree = () => {
    if (onAgree) {
      onAgree({
        documentId: document.id,
        version: document.version,
      })
    }
    setAgreed(true)
  }

  const handleDisagree = () => {
    if (onDisagree) {
      onDisagree()
    }
    setAgreed(false)
  }

  const isOutdated =
    existingAgreement && existingAgreement.version !== document.version

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{document.title}</CardTitle>
              {required && (
                <Badge variant="destructive" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
            <CardDescription>
              Version {document.version} • Effective {document.effectiveDate}
            </CardDescription>
          </div>
          {existingAgreement && !isOutdated && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Agreed
            </Badge>
          )}
          {isOutdated && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Update Required
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isOutdated && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This document has been updated since you last agreed. Please review
              the new version and agree again.
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea
          className="h-[400px] w-full rounded-md border p-4"
          onScrollCapture={handleScroll}
        >
          <div className="prose prose-sm max-w-none dark:prose-invert">
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
                    // Convert bold
                    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    // Convert italic
                    line = line.replace(/\*(.*?)\*/g, '<em>$1</em>')
                    // Convert links
                    line = line.replace(
                      /\[([^\]]+)\]\(([^)]+)\)/g,
                      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
                    )
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
        </ScrollArea>

        {!hasScrolledToBottom && !agreed && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please scroll to the bottom to read the entire document before
              agreeing.
            </AlertDescription>
          </Alert>
        )}

        {!agreed && (
          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id={`agree-${document.id}`}
                disabled={!hasScrolledToBottom}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleAgree()
                  } else {
                    handleDisagree()
                  }
                }}
              />
              <label
                htmlFor={`agree-${document.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I have read, understood, and agree to the {document.title}
              </label>
            </div>

            {required && (
              <p className="text-xs text-muted-foreground">
                * You must agree to this document to continue with manuscript
                submission.
              </p>
            )}
          </div>
        )}

        {agreed && !isOutdated && (
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                You have agreed to this document
              </span>
            </div>
            {existingAgreement && (
              <span className="text-xs text-green-700 dark:text-green-400">
                Agreed on {new Date(existingAgreement.agreedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/legal/${document.type}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Page
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" />
            Print/Save
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface LegalAgreementDialogProps {
  documents: LegalDocument[]
  userAgreements?: UserAgreement[]
  onAgreeAll?: (agreements: Omit<UserAgreement, 'agreedAt' | 'ipAddress' | 'userAgent'>[]) => void
  onCancel?: () => void
  open?: boolean
}

export function LegalAgreementDialog({
  documents,
  userAgreements = [],
  onAgreeAll,
  onCancel,
}: LegalAgreementDialogProps) {
  const [agreements, setAgreements] = useState<
    Omit<UserAgreement, 'agreedAt' | 'ipAddress' | 'userAgent'>[]
  >(
    userAgreements.map((a) => ({
      documentId: a.documentId,
      version: a.version,
    }))
  )

  const handleAgree = (
    agreement: Omit<UserAgreement, 'agreedAt' | 'ipAddress' | 'userAgent'>
  ) => {
    setAgreements((prev) => {
      const filtered = prev.filter((a) => a.documentId !== agreement.documentId)
      return [...filtered, agreement]
    })
  }

  const handleDisagree = (documentId: string) => {
    setAgreements((prev) => prev.filter((a) => a.documentId !== documentId))
  }

  const allAgreed = documents.every((doc) =>
    agreements.some((a) => a.documentId === doc.id && a.version === doc.version)
  )

  const handleSubmit = () => {
    if (allAgreed && onAgreeAll) {
      onAgreeAll(agreements)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Review Legal Documents</h2>
        <p className="text-muted-foreground">
          Please review and agree to the following documents before submitting your
          manuscript.
        </p>
      </div>

      <div className="space-y-6">
        {documents.map((doc) => (
          <LegalDocumentViewer
            key={doc.id}
            document={doc}
            onAgree={handleAgree}
            onDisagree={() => handleDisagree(doc.id)}
            existingAgreement={userAgreements.find((a) => a.documentId === doc.id)}
            required
          />
        ))}
      </div>

      <div className="flex items-center justify-end gap-4 pt-4 border-t">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={!allAgreed}>
          {allAgreed ? 'Continue to Submission' : 'Read and Agree to All Documents'}
        </Button>
      </div>
    </div>
  )
}
