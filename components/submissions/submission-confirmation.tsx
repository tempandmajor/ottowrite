'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Send,
  Building2,
  FileText,
  BookOpen,
  User,
  Shield,
  Info,
  X,
} from 'lucide-react'
import type { SubmissionPartner } from '@/lib/submissions/types'

interface SubmissionConfirmationProps {
  submission: any // ManuscriptSubmission type
  partners: SubmissionPartner[]
}

export function SubmissionConfirmation({ submission, partners }: SubmissionConfirmationProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToIP, setAgreedToIP] = useState(false)

  const handleSubmit = async () => {
    if (!agreedToTerms || !agreedToIP) {
      setError('Please agree to the terms and conditions and IP protection agreement')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Record legal agreements before submission
      const agreementsToRecord = [
        {
          documentId: 'submission-tos-v1',
          documentType: 'terms' as const,
          documentVersion: '1.0',
        },
        {
          documentId: 'ip-protection-v1',
          documentType: 'ip-protection' as const,
          documentVersion: '1.0',
        },
      ]

      // Record each agreement
      for (const agreement of agreementsToRecord) {
        const agreementResponse = await fetch('/api/legal/agreements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agreement),
        })

        if (!agreementResponse.ok) {
          throw new Error('Failed to record legal agreements')
        }
      }

      // Submit to all selected partners
      const response = await fetch(`/api/submissions/${submission.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner_ids: partners.map((p) => p.id),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit')
      }

      // Redirect to success page
      router.push(`/dashboard/submissions/${submission.id}?submitted=true`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
      setSubmitting(false)
    }
  }

  const handleRemovePartner = (partnerId: string) => {
    const remainingPartnerIds = partners.filter((p) => p.id !== partnerId).map((p) => p.id)

    if (remainingPartnerIds.length === 0) {
      router.push(`/dashboard/submissions/${submission.id}/select-partners`)
    } else {
      router.push(
        `/dashboard/submissions/${submission.id}/confirm?partners=${remainingPartnerIds.join(',')}`
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href={`/dashboard/submissions/${submission.id}/select-partners`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Partner Selection
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Review & Submit</h1>
        <p className="text-muted-foreground mt-2">
          Review your submission details and selected partners before submitting
        </p>
      </div>

      {/* Submission Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <FileText className="h-5 w-5 mr-2" />
            Submission Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Title</div>
              <div className="font-medium">{submission.title}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Genre</div>
              <div className="font-medium">{submission.genre}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Type</div>
              <div className="font-medium capitalize">{submission.type.replace('_', ' ')}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Word Count</div>
              <div className="font-medium">{submission.word_count.toLocaleString()}</div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-sm text-muted-foreground mb-2">Query Letter</div>
            <div className="prose prose-sm max-w-none p-4 bg-muted rounded-lg">
              <p className="line-clamp-3">{submission.query_letter}</p>
            </div>
            <Link href={`/dashboard/submissions/${submission.id}/edit`}>
              <Button variant="ghost" size="sm" className="mt-2">
                Edit Submission
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Selected Partners */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <Building2 className="h-5 w-5 mr-2" />
              Selected Partners ({partners.length})
            </CardTitle>
            <Link href={`/dashboard/submissions/${submission.id}/select-partners`}>
              <Button variant="outline" size="sm">
                Change Selection
              </Button>
            </Link>
          </div>
          <CardDescription>Your manuscript will be submitted to these partners</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="flex items-center justify-between p-4 rounded-lg border"
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
                  disabled={submitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* IP Protection Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>IP Protection Enabled:</strong> Your manuscript will be watermarked with unique
          identifiers for each partner. This helps protect your intellectual property and track
          unauthorized distribution.
        </AlertDescription>
      </Alert>

      {/* Terms & Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              disabled={submitting}
            />
            <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-relaxed">
              I agree to OttoWrite&apos;s{' '}
              <Link href="/legal/submissions-terms" className="text-primary hover:underline" target="_blank">
                Submission Terms & Conditions
              </Link>{' '}
              and understand that by submitting my manuscript, I am granting selected partners
              temporary access to review my work.
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="ip"
              checked={agreedToIP}
              onCheckedChange={(checked) => setAgreedToIP(checked === true)}
              disabled={submitting}
            />
            <Label htmlFor="ip" className="text-sm font-normal cursor-pointer leading-relaxed">
              I understand that my manuscript will be watermarked for IP protection, and I agree to
              OttoWrite&apos;s{' '}
              <Link href="/legal/ip-protection" className="text-primary hover:underline" target="_blank">
                IP Protection Policy
              </Link>
              .
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>What happens next?</strong> After submitting, you&apos;ll be able to track the
          status of your submission, see when partners view your work, and receive notifications
          for any updates.
        </AlertDescription>
      </Alert>

      {/* Submit Button */}
      <div className="flex items-center justify-between gap-4">
        <Link href={`/dashboard/submissions/${submission.id}/select-partners`}>
          <Button variant="outline" disabled={submitting}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <Button
          onClick={handleSubmit}
          disabled={!agreedToTerms || !agreedToIP || submitting}
          size="lg"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? 'Submitting...' : `Submit to ${partners.length} Partner${partners.length !== 1 ? 's' : ''}`}
        </Button>
      </div>

      {/* Bottom Sticky Action */}
      <div className="sticky bottom-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg border shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="text-sm">
            <div className="font-medium">
              {partners.length} partner{partners.length !== 1 ? 's' : ''} selected
            </div>
            <div className="text-muted-foreground">
              {agreedToTerms && agreedToIP ? 'Ready to submit' : 'Please agree to terms'}
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!agreedToTerms || !agreedToIP || submitting}
            size="lg"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit Now'}
          </Button>
        </div>
      </div>
    </div>
  )
}
