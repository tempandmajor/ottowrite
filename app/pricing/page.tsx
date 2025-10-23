'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Clock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { ManageSubscriptionButton } from '@/components/account/manage-subscription-button'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out Ottowrite',
    features: [
      '25,000 AI words/month',
      '5 documents max',
      'Claude Sonnet 4.5',
      'Basic exports (PDF, MD, TXT)',
      '30-day version history',
      'Prose editor',
    ],
    cta: 'Get Started',
    href: '/auth/signup',
    popular: false,
    hasTrial: false,
  },
  {
    name: 'Hobbyist',
    price: '$20',
    period: '/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_HOBBYIST || 'price_hobbyist',
    description: 'For serious writers',
    features: [
      '100,000 AI words/month',
      'Unlimited documents',
      'All AI models (Claude, GPT-5, DeepSeek)',
      'All export formats',
      'Unlimited version history',
      'Screenplay formatting',
      'Advanced features',
    ],
    cta: 'Start 7-Day Free Trial',
    popular: true,
    hasTrial: true,
  },
  {
    name: 'Professional',
    price: '$60',
    period: '/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL || 'price_professional',
    description: 'For professional authors',
    features: [
      '500,000 AI words/month',
      'Everything in Hobbyist',
      'API access (50 req/day)',
      'Priority support',
      'Batch processing',
      'Advanced analytics',
      'Publishing tools',
    ],
    cta: 'Start 7-Day Free Trial',
    popular: false,
    hasTrial: true,
  },
  {
    name: 'Studio',
    price: '$100',
    period: '/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STUDIO || 'price_studio',
    description: 'For teams and studios',
    features: [
      '2,000,000 AI words/month',
      'Everything in Professional',
      'Unlimited manuscript submissions',
      'Verified agent & publisher network',
      'Watermarking & IP protection',
      '5 team seats included',
      'Real-time collaboration',
      'Team workspace',
      'Dedicated support',
    ],
    cta: 'Start 7-Day Free Trial',
    popular: false,
    hasTrial: true,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await fetch('/api/account/usage', { cache: 'no-store' })
        if (!response.ok) {
          return
        }
        const payload = await response.json()
        if (payload?.plan) {
          setCurrentPlan(payload.plan)
        }
      } catch (error) {
        console.warn('Failed to load plan info:', error)
      }
    }

    void fetchUsage()
  }, [])

  const handleSubscribe = async (priceId?: string) => {
    if (!priceId) {
      router.push('/auth/signup')
      return
    }

    setLoading(priceId)

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      })
      if (response.status === 401) {
        router.push('/auth/login?redirect=/pricing')
        return
      }

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast({
          title: 'Unable to start checkout',
          description: payload.error ?? 'Please try again in a moment.',
          variant: 'destructive',
        })
        return
      }

      if (typeof payload.url === 'string' && payload.url.length > 0) {
        window.location.href = payload.url
      } else {
        toast({
          title: 'Checkout unavailable',
          description: 'Stripe did not return a checkout URL. Please try again shortly.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Subscription error:', error)
      toast({
        title: 'Unable to start checkout',
        description: error instanceof Error ? error.message : 'Please try again shortly.',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            Ottowrite
          </Link>
          <div className="flex gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Sign Up</Button>
            </Link>
            {currentPlan && currentPlan !== 'free' && <ManageSubscriptionButton />}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Choose the plan that fits your writing needs. All plans include a 7-day free trial.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col ${
                plan.popular ? 'border-primary shadow-lg' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  {plan.hasTrial && (
                    <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      7-day trial
                    </Badge>
                  )}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                  {plan.hasTrial && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Try free for 7 days, then {plan.price}/month
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.priceId)}
                  disabled={loading === plan.priceId}
                >
                  {loading === plan.priceId ? 'Loading...' : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-16 border-t">
        <h2 className="text-3xl font-bold text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-2">
              What counts as an AI word?
            </h3>
            <p className="text-muted-foreground">
              Every word generated by our AI counts toward your monthly limit. This includes
              continuations, rewrites, and any AI-assisted content.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">
              Can I change plans anytime?
            </h3>
            <p className="text-muted-foreground">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect
              at the start of your next billing cycle.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">
              What happens if I exceed my word limit?
            </h3>
            <p className="text-muted-foreground">
              AI generation will pause until your next billing cycle, or you can upgrade
              to a higher tier for immediate access to more words.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">
              Do you offer refunds?
            </h3>
            <p className="text-muted-foreground">
              Yes, we offer a 7-day money-back guarantee on all paid plans. No questions asked.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">
              What are manuscript submissions?
            </h3>
            <p className="text-muted-foreground">
              Studio plan includes unlimited submissions to our network of verified literary agents
              and publishers. Each submission is watermarked for IP protection, and you can track
              responses directly in your dashboard. This feature is exclusive to Studio subscribers.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">
              How does the watermarking work?
            </h3>
            <p className="text-muted-foreground">
              Every manuscript sent to agents and publishers receives a unique, invisible watermark.
              This protects your intellectual property and allows you to track the source if your
              work is leaked or distributed without authorization.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
