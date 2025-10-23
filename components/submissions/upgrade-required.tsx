'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Send, Shield, Zap, Crown, Check } from 'lucide-react'
import Link from 'next/link'
import { SUBMISSIONS_UPGRADE_URL } from '@/lib/submissions/access'

interface SubmissionsUpgradeRequiredProps {
  currentPlan?: string | null
}

export function SubmissionsUpgradeRequired({ currentPlan }: SubmissionsUpgradeRequiredProps) {
  return (
    <div className="container max-w-5xl py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <Send className="h-12 w-12 text-primary" />
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Manuscript Submissions</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Submit your finished manuscripts directly to our curated network of literary agents and
          publishers. Studio exclusive feature.
        </p>
      </div>

      {/* Feature Preview */}
      <div className="grid gap-6 md:grid-cols-3 mb-12">
        <Card>
          <CardHeader>
            <Shield className="h-8 w-8 text-primary mb-2" />
            <CardTitle>IP Protection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Advanced watermarking, access control, and audit trails keep your work safe
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Zap className="h-8 w-8 text-primary mb-2" />
            <CardTitle>AI-Powered Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Auto-generate query letters and synopses that follow industry standards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Send className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Direct Access</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Submit directly to verified agents and publishers actively seeking new work
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade CTA */}
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-6 w-6 text-primary" />
            <CardTitle>Upgrade to Studio</CardTitle>
          </div>
          <CardDescription>
            Get unlimited manuscript submissions and exclusive access to our partner network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Unlimited Submissions</p>
                  <p className="text-sm text-muted-foreground">
                    Submit to as many agents as you want, no caps
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Verified Partners Only</p>
                  <p className="text-sm text-muted-foreground">
                    All agents and publishers are verified and vetted
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Advanced IP Protection</p>
                  <p className="text-sm text-muted-foreground">
                    Watermarking, access control, and audit trails
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Priority Review</p>
                  <p className="text-sm text-muted-foreground">
                    Your submissions are flagged for faster response
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Submission Analytics</p>
                  <p className="text-sm text-muted-foreground">
                    Track response rates, acceptance rates, and more
                  </p>
                </div>
              </div>
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
                  <Link href={SUBMISSIONS_UPGRADE_URL}>
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
          Join Studio members who are getting discovered by top agents
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
          <div>
            <p className="text-2xl font-bold text-foreground">50+</p>
            <p className="text-xs">Verified Partners</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">100%</p>
            <p className="text-xs">IP Protected</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">24h</p>
            <p className="text-xs">Avg. First Response</p>
          </div>
        </div>
      </div>
    </div>
  )
}
