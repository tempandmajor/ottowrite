'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PartnerResponseFormProps {
  submissionId: string
  partnerId: string
  currentStatus: string
  currentResponse?: string | null
}

export function PartnerResponseForm({
  submissionId,
  currentStatus,
  currentResponse,
}: PartnerResponseFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [decision, setDecision] = useState<string>(currentStatus)
  const [message, setMessage] = useState(currentResponse || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!decision || decision === 'submitted' || decision === 'viewed') {
      toast({
        title: 'Please select a decision',
        description: 'Choose accept, reject, or request more materials',
        variant: 'destructive',
      })
      return
    }

    if (!message.trim()) {
      toast({
        title: 'Message required',
        description: 'Please provide a message to the author',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/partners/submissions/${submissionId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: decision,
          response_message: message,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit response')
      }

      toast({
        title: 'Response submitted',
        description: 'Your response has been sent to the author',
      })

      router.refresh()
    } catch (error) {
      toast({
        title: 'Failed to submit response',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const hasResponded = currentStatus !== 'submitted' && currentStatus !== 'viewed'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Response</CardTitle>
        <CardDescription>
          {hasResponded
            ? 'You have already responded to this submission. You can update your response below.'
            : 'Provide your decision and feedback to the author'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasResponded && currentResponse && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Previous Response ({currentStatus}):</strong>
              <p className="mt-2 text-sm">{currentResponse}</p>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="decision">Decision</Label>
            <Select value={decision} onValueChange={setDecision}>
              <SelectTrigger id="decision">
                <SelectValue placeholder="Select your decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewed">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Still reviewing
                  </div>
                </SelectItem>
                <SelectItem value="accepted">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Accept / Request Full Manuscript
                  </div>
                </SelectItem>
                <SelectItem value="requested_more">
                  <div className="flex items-center gap-2 text-blue-600">
                    <FileText className="h-4 w-4" />
                    Request More Materials
                  </div>
                </SelectItem>
                <SelectItem value="rejected">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    Decline / Pass
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message to Author</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide feedback or next steps for the author..."
              rows={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              This message will be sent to the author via email and shown in their dashboard
            </p>
          </div>

          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/partners/dashboard')}
            >
              Back to Inbox
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {hasResponded ? 'Update Response' : 'Submit Response'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
