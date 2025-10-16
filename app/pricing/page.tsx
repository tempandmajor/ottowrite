'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out OttoWrite',
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
  },
  {
    name: 'Hobbyist',
    price: '$12',
    period: '/month',
    priceId: 'price_1SImHmA2PfDiF2t51g2eMfQF',
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
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Professional',
    price: '$24',
    period: '/month',
    priceId: 'price_1SImHzA2PfDiF2t5WLRx7tN0',
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
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Studio',
    price: '$49',
    period: '/month',
    priceId: 'price_1SImIBA2PfDiF2t5L1x0YMwt',
    description: 'For teams and studios',
    features: [
      '2,000,000 AI words/month',
      'Everything in Professional',
      '5 team seats included',
      'Real-time collaboration',
      'Team workspace',
      'Publishing integrations',
      'Dedicated support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

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

      const { url, error } = await response.json()

      if (error) {
        console.error('Checkout error:', error)
        return
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Subscription error:', error)
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
            OttoWrite
          </Link>
          <div className="flex gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Sign Up</Button>
            </Link>
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
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
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
        </div>
      </div>
    </div>
  )
}
