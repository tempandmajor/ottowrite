import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText,
  User,
  BookOpen,
  Calendar,
  Shield,
  AlertCircle,
  Mail,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { SubmissionPartner } from '@/lib/submissions/types'

interface PartnerManuscriptViewerProps {
  submission: any
  partnerSubmission: any
  partner: SubmissionPartner
}

export function PartnerManuscriptViewer({
  submission,
  partnerSubmission,
}: PartnerManuscriptViewerProps) {
  const author = submission.user_profiles

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">{submission.title}</CardTitle>
              <CardDescription className="flex items-center gap-4 flex-wrap text-base">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {author.full_name}
                </span>
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {author.email}
                </span>
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {submission.genre}
                </span>
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {submission.word_count?.toLocaleString()} words
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Submitted {formatDistanceToNow(new Date(partnerSubmission.submitted_at), { addSuffix: true })}
                </span>
              </CardDescription>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Watermarked
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* IP Protection Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Confidentiality Notice:</strong> This manuscript is protected by digital watermarking technology.
          Unauthorized distribution or sharing may be tracked and is prohibited. Please review according to
          industry standard practices and maintain confidentiality.
        </AlertDescription>
      </Alert>

      {/* Manuscript Content */}
      <Card>
        <CardHeader>
          <CardTitle>Manuscript Materials</CardTitle>
          <CardDescription>
            Query letter, synopsis, and sample pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="query" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="query">Query Letter</TabsTrigger>
              <TabsTrigger value="synopsis">Synopsis</TabsTrigger>
              <TabsTrigger value="sample">
                Sample Pages ({submission.sample_pages_count || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="query" className="mt-6">
              <ScrollArea className="h-[600px] w-full rounded-md border p-6">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap font-serif">
                    {submission.query_letter || 'No query letter provided.'}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="synopsis" className="mt-6">
              <ScrollArea className="h-[600px] w-full rounded-md border p-6">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap font-serif">
                    {submission.synopsis || 'No synopsis provided.'}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="sample" className="mt-6">
              <ScrollArea className="h-[600px] w-full rounded-md border p-6">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap font-serif">
                    {submission.sample_pages || 'No sample pages provided.'}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Watermark Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Submission Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Submission ID:</span>
            <span className="font-mono">{partnerSubmission.id}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Watermark ID:</span>
            <span className="font-mono text-xs">
              {partnerSubmission.watermark_data?.watermarkId || 'N/A'}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Access Expires:</span>
            <span>
              {partnerSubmission.access_expires_at
                ? new Date(partnerSubmission.access_expires_at).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant="secondary">{partnerSubmission.status}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
