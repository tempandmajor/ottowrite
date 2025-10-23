'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { PartnerDirectory } from './partner-directory'
import {
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Send,
  Info,
  Building2,
  X,
} from 'lucide-react'
import type { SubmissionPartner } from '@/lib/submissions/types'

interface PartnerSelectionFlowProps {
  submission: any // ManuscriptSubmission type
}

export function PartnerSelectionFlow({ submission }: PartnerSelectionFlowProps) {
  const router = useRouter()
  const [selectedPartners, setSelectedPartners] = useState<SubmissionPartner[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectPartner = (partner: SubmissionPartner) => {
    setSelectedPartners((prev) => {
      const isAlreadySelected = prev.some((p) => p.id === partner.id)

      if (isAlreadySelected) {
        // Remove if already selected
        return prev.filter((p) => p.id !== partner.id)
      } else {
        // Add if not selected
        return [...prev, partner]
      }
    })
  }

  const handleRemovePartner = (partnerId: string) => {
    setSelectedPartners((prev) => prev.filter((p) => p.id !== partnerId))
  }

  const handleSubmit = async () => {
    if (selectedPartners.length === 0) {
      setError('Please select at least one partner to submit to')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Submit to selected partners
      // This will be handled in MS-2.3 (Submission Confirmation Flow)
      // For now, just navigate to confirmation
      router.push(`/dashboard/submissions/${submission.id}/confirm?partners=${selectedPartners.map(p => p.id).join(',')}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to proceed with submission')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/submissions">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Submissions
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Select Partners</h1>
        <p className="text-muted-foreground mt-2">
          Choose which literary agents or publishers to submit &quot;{submission.title}&quot; to
        </p>
      </div>

      {/* Submission Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Manuscript Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Title</div>
              <div className="font-medium">{submission.title}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Genre</div>
              <div className="font-medium">{submission.genre}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Type</div>
              <div className="font-medium capitalize">{submission.type.replace('_', ' ')}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Word Count</div>
              <div className="font-medium">{submission.word_count.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Tip:</strong> Research each partner before submitting. Check their submission
          guidelines, recent sales, and client list. Quality over quantity - it&apos;s better to
          submit to a few well-matched partners than many random ones.
        </AlertDescription>
      </Alert>

      {/* Selected Partners Panel */}
      {selectedPartners.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  Selected Partners ({selectedPartners.length})
                </CardTitle>
                <CardDescription>
                  Your manuscript will be submitted to these partners
                </CardDescription>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting || selectedPartners.length === 0}
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Processing...' : 'Continue to Review'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedPartners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {partner.name}
                        {partner.verified && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {partner.company} · {partner.type}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePartner(partner.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Partner Directory */}
      <PartnerDirectory
        _submissionId={submission.id}
        manuscriptGenre={submission.genre}
        onSelectPartner={handleSelectPartner}
        selectedPartners={selectedPartners.map((p) => p.id)}
      />

      {/* Bottom Actions */}
      {selectedPartners.length > 0 && (
        <div className="sticky bottom-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg border shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="text-sm">
              <span className="font-medium">{selectedPartners.length}</span> partner
              {selectedPartners.length !== 1 ? 's' : ''} selected
            </div>
            <Button onClick={handleSubmit} disabled={submitting} size="lg">
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Processing...' : 'Continue to Review'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
