'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Send, Shield, Zap, Crown, Check, AlertCircle, FileText } from 'lucide-react'
import Link from 'next/link'
import { STUDIO_UPGRADE_URLS } from '@/lib/studio/access'

interface StudioUpgradeRequiredProps {
  currentPlan?: string | null
  feature?: 'submissions' | 'ipProtection' | 'dmca' | 'default'
}

const featureConfig = {
  submissions: {
    icon: Send,
    title: 'Manuscript Submissions',
    description: 'Submit your finished manuscripts directly to our curated network of literary agents and publishers. Studio exclusive feature.',
    upgradeUrl: STUDIO_UPGRADE_URLS.submissions,
    features: [
      {
        title: 'Unlimited Submissions',
        description: 'Submit to as many agents as you want, no caps',
      },
      {
        title: 'Verified Partners Only',
        description: 'All agents and publishers are verified and vetted',
      },
      {
        title: 'Advanced IP Protection',
        description: 'Watermarking, access control, and audit trails',
      },
      {
        title: 'Priority Review',
        description: 'Your submissions are flagged for faster response',
      },
      {
        title: 'Submission Analytics',
        description: 'Track response rates, acceptance rates, and more',
      },
    ],
    previewCards: [
      {
        icon: Shield,
        title: 'IP Protection',
        description: 'Advanced watermarking, access control, and audit trails keep your work safe',
      },
      {
        icon: Zap,
        title: 'AI-Powered Tools',
        description: 'Auto-generate query letters and synopses that follow industry standards',
      },
      {
        icon: Send,
        title: 'Direct Access',
        description: 'Submit directly to verified agents and publishers actively seeking new work',
      },
    ],
    stats: [
      { value: '50+', label: 'Verified Partners' },
      { value: '100%', label: 'IP Protected' },
      { value: '24h', label: 'Avg. First Response' },
    ],
  },
  ipProtection: {
    icon: Shield,
    title: 'IP Protection & Security',
    description: 'Monitor access to your manuscripts with advanced security features including watermarking, audit logs, and DMCA takedown management. Studio exclusive feature.',
    upgradeUrl: STUDIO_UPGRADE_URLS.ipProtection,
    features: [
      {
        title: 'Advanced Watermarking',
        description: 'Automatically watermark all shared manuscripts to track unauthorized distribution',
      },
      {
        title: 'Access Audit Logs',
        description: 'Detailed logs of every access with IP addresses, locations, and durations',
      },
      {
        title: 'Security Alerts',
        description: 'Real-time alerts for suspicious activity like rapid access or unusual locations',
      },
      {
        title: 'DMCA Takedown Tools',
        description: 'Streamlined process for filing DMCA takedown requests with pre-filled templates',
      },
      {
        title: 'Access Timeline Analytics',
        description: 'Visualize access patterns and identify your most engaged partners',
      },
    ],
    previewCards: [
      {
        icon: Shield,
        title: 'DRM Protection',
        description: 'Prevent unauthorized copying, printing, and downloading of your work',
      },
      {
        icon: AlertCircle,
        title: 'Security Monitoring',
        description: 'Real-time alerts for suspicious access patterns and potential theft',
      },
      {
        icon: FileText,
        title: 'DMCA Management',
        description: 'File and track copyright infringement takedown requests',
      },
    ],
    stats: [
      { value: '100%', label: 'Protected' },
      { value: 'Real-time', label: 'Alerts' },
      { value: '24/7', label: 'Monitoring' },
    ],
  },
  dmca: {
    icon: FileText,
    title: 'DMCA Takedown Management',
    description: 'Protect your copyright with streamlined DMCA takedown request tools. File, track, and manage copyright infringement claims. Studio exclusive feature.',
    upgradeUrl: STUDIO_UPGRADE_URLS.dmca,
    features: [
      {
        title: 'Pre-filled Templates',
        description: 'DMCA notice templates for major platforms (Amazon, Wattpad, etc.)',
      },
      {
        title: 'Request Tracking',
        description: 'Monitor the status of all your DMCA requests in one place',
      },
      {
        title: 'Activity Logging',
        description: 'Complete audit trail of all takedown requests and responses',
      },
      {
        title: 'Legal Guidance',
        description: 'Step-by-step guidance through the DMCA process',
      },
      {
        title: 'Response Analytics',
        description: 'Track success rates and response times by platform',
      },
    ],
    previewCards: [
      {
        icon: FileText,
        title: 'Easy Filing',
        description: 'Guided workflow with pre-filled templates for common platforms',
      },
      {
        icon: AlertCircle,
        title: 'Status Tracking',
        description: 'Monitor the progress of all your takedown requests',
      },
      {
        icon: Shield,
        title: 'Legal Protection',
        description: 'Protect your copyright with proper legal documentation',
      },
    ],
    stats: [
      { value: '95%', label: 'Success Rate' },
      { value: '7 days', label: 'Avg. Resolution' },
      { value: '24/7', label: 'Support' },
    ],
  },
  default: {
    icon: Crown,
    title: 'Studio Features',
    description: 'Access the complete suite of professional manuscript management tools including submissions, IP protection, and advanced analytics. Studio exclusive.',
    upgradeUrl: STUDIO_UPGRADE_URLS.default,
    features: [
      {
        title: 'Manuscript Submissions',
        description: 'Submit to verified agents and publishers with unlimited submissions',
      },
      {
        title: 'IP Protection & Security',
        description: 'Watermarking, access control, audit logs, and security alerts',
      },
      {
        title: 'DMCA Takedown Management',
        description: 'File and track copyright infringement takedown requests',
      },
      {
        title: 'Advanced Analytics',
        description: 'Track submission performance, partner engagement, and more',
      },
      {
        title: 'Priority Support',
        description: 'Get faster response times and dedicated account management',
      },
    ],
    previewCards: [
      {
        icon: Send,
        title: 'Submissions',
        description: 'Submit directly to verified agents and publishers',
      },
      {
        icon: Shield,
        title: 'IP Protection',
        description: 'Advanced security monitoring and copyright protection',
      },
      {
        icon: Zap,
        title: 'Advanced Tools',
        description: 'AI-powered query letters, analytics, and more',
      },
    ],
    stats: [
      { value: '50+', label: 'Partners' },
      { value: '100%', label: 'Protected' },
      { value: '24h', label: 'Support' },
    ],
  },
}

export function StudioUpgradeRequired({ currentPlan, feature = 'default' }: StudioUpgradeRequiredProps) {
  const config = featureConfig[feature]
  const IconComponent = config.icon

  return (
    <div className="container max-w-5xl py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <IconComponent className="h-12 w-12 text-primary" />
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold mb-4">{config.title}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {config.description}
        </p>
      </div>

      {/* Feature Preview */}
      <div className="grid gap-6 md:grid-cols-3 mb-12">
        {config.previewCards.map((card) => {
          const CardIcon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader>
                <CardIcon className="h-8 w-8 text-primary mb-2" />
                <CardTitle>{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Upgrade CTA */}
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-6 w-6 text-primary" />
            <CardTitle>Upgrade to Studio</CardTitle>
          </div>
          <CardDescription>
            Get access to all Studio features including submissions, IP protection, and advanced analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3">
              {config.features.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-2xl font-bold">
                    $49<span className="text-sm font-normal text-muted-foreground">/month</span>
                  </p>
                  <p className="text-sm text-muted-foreground">Studio Plan</p>
                </div>
                <Button size="lg" asChild>
                  <Link href={config.upgradeUrl}>
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade to Studio
                  </Link>
                </Button>
              </div>

              {currentPlan && (
                <p className="text-xs text-muted-foreground">
                  You&apos;re currently on the{' '}
                  {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Proof */}
      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Join Studio members who are managing their manuscripts professionally
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
          {config.stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
