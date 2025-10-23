/**
 * Coming Soon Page Component
 *
 * Professional placeholder page for features under development.
 * Includes feature preview, launch timeline, and optional waitlist signup.
 *
 * Usage:
 * ```tsx
 * <ComingSoonPage
 *   featureId="ghostwriter"
 *   icon={<Sparkles />}
 * />
 * ```
 */

'use client'

import { ReactNode, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Bell,
  Sparkles,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import { getFeatureConfig } from '@/lib/features/feature-flags'

interface ComingSoonPageProps {
  featureId: string
  icon?: ReactNode
  benefits?: string[]
  previewImage?: string
}

export function ComingSoonPage({
  featureId,
  icon,
  benefits,
  previewImage,
}: ComingSoonPageProps) {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  const config = getFeatureConfig(featureId)

  if (!config) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Alert variant="destructive">
          <AlertDescription>Feature not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  const handleWaitlistSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Implement waitlist signup API
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSubscribed(true)
    } catch (error) {
      console.error('Failed to join waitlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const launchDate = config.launchDate ? new Date(config.launchDate) : null
  const daysUntilLaunch = launchDate
    ? Math.ceil((launchDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  // Default benefits if not provided
  const featureBenefits = benefits || getDefaultBenefits(featureId)

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>

      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            {icon || getDefaultIcon(featureId)}
          </div>
          <Badge variant="secondary" className="text-sm">
            <Clock className="h-3 w-3 mr-1" />
            Coming Soon
          </Badge>
        </div>

        <h1 className="text-4xl font-bold mb-4">{config.name}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {config.description}
        </p>

        {launchDate && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Expected Launch: {launchDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            {daysUntilLaunch && daysUntilLaunch > 0 && (
              <Badge variant="outline" className="ml-2">
                ~{daysUntilLaunch} days
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Preview Image */}
      {previewImage && (
        <Card className="mb-12 overflow-hidden">
          <img
            src={previewImage}
            alt={`${config.name} preview`}
            className="w-full h-auto"
          />
        </Card>
      )}

      {/* What to Expect */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What to Expect</CardTitle>
          <CardDescription>
            Here&apos;s what you&apos;ll be able to do with {config.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {featureBenefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{benefit}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Waitlist Signup */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Get Early Access
          </CardTitle>
          <CardDescription>
            Be the first to know when {config.name} launches. We&apos;ll send you an email as soon as
            it&apos;s ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscribed ? (
            <Alert className="border-primary/20 bg-primary/10">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong className="text-primary">You&apos;re on the list!</strong> We&apos;ll notify you when{' '}
                {config.name} launches.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleWaitlistSignup} className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                {loading ? 'Joining...' : 'Notify Me'}
              </Button>
            </form>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </CardContent>
      </Card>

      {/* Development Progress (Optional) */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          We&apos;re working hard to bring you this feature. Follow our progress:
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/changelog" className="text-sm text-primary hover:underline">
            View Changelog
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/roadmap" className="text-sm text-primary hover:underline">
            Product Roadmap
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Get default icon for a feature
 */
function getDefaultIcon(featureId: string): ReactNode {
  const icons: Record<string, ReactNode> = {
    ghostwriter: <Sparkles className="h-6 w-6 text-primary" />,
    manuscript_submission: <FileText className="h-6 w-6 text-primary" />,
  }
  return icons[featureId] || <Sparkles className="h-6 w-6 text-primary" />
}

/**
 * Get default benefits for a feature
 */
function getDefaultBenefits(featureId: string): string[] {
  const benefitsMap: Record<string, string[]> = {
    ghostwriter: [
      'Generate story chunks with AI that maintains consistency with your existing content',
      'Track character traits, plot points, and story context across generations',
      'Review and refine AI-generated content with quality scoring',
      'Seamlessly integrate chunks into your manuscripts',
      'Manage your word quota and track generation statistics',
    ],
    manuscript_submission: [
      'Submit manuscripts to agents and publishers directly from the platform',
      'Track submission status and partner responses in real-time',
      'Protect your intellectual property with watermarking and DRM',
      'Monitor who views and downloads your submissions',
      'Generate AI-powered query letters and synopses',
      'Access detailed analytics on submission performance',
    ],
  }

  return benefitsMap[featureId] || [
    'Streamline your writing workflow',
    'Save time with automated tools',
    'Professional-grade features',
  ]
}
