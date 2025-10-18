import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  PenTool,
  Sparkles,
  Compass,
  Quote,
  ArrowRight,
} from 'lucide-react'

const featureHighlights = [
  {
    icon: Sparkles,
    title: 'AI Brainstorming',
    description:
      'Generate characters, scenes, and plot twists tailored to your genre in seconds.',
  },
  {
    icon: PenTool,
    title: 'Structured Editing',
    description:
      'Stay organized with beat sheets, outlines, and character arcs that evolve with your story.',
  },
  {
    icon: Compass,
    title: 'Story Guidance',
    description:
      'Spot plot holes, track relationships, and keep every narrative thread moving forward.',
  },
]

const workflowSteps = [
  {
    title: 'Plan',
    text: 'Start with templates, beat sheets, and world-building tools that set the direction.',
  },
  {
    title: 'Write',
    text: 'Draft faster with AI-assisted prose, screenplay formatting, and on-demand suggestions.',
  },
  {
    title: 'Refine',
    text: 'Use analytics and automated reviews to tighten pacing, tone, and character motivations.',
  },
]

const testimonials = [
  {
    quote:
      'Ottowrite helped me outline an entire season in a weekend. The AI suggestions feel like brainstorming with a pro writer.',
    author: 'Morgan Lee',
    role: 'TV Writer & Showrunner',
  },
  {
    quote:
      'The character tools keep arcs consistent across chapters. I can finally track motivations without drowning in spreadsheets.',
    author: 'Jasmine Patel',
    role: 'Fantasy Novelist',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col px-6 pb-24 pt-8 sm:px-8 md:px-12 lg:px-16">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Ottowrite
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">
                Start Writing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="mt-20 grid gap-12 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div className="space-y-6 text-center md:text-left">
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              AI-powered storytelling suite
            </span>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              Craft unforgettable stories with an AI collaborator by your side.
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg md:text-xl">
              Ottowrite combines world-class outlining, character management, and writing guidance so you can focus on the heart of your story.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center md:justify-start">
              <Button size="lg" asChild>
                <Link href="/auth/signup">Create Free Account</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/dashboard">See It in Action</Link>
              </Button>
            </div>
          </div>
          <div className="relative rounded-3xl border bg-background/80 p-8 shadow-lg backdrop-blur">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Your writing cockpit</h2>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li className="rounded-lg border bg-card/60 p-4 shadow-sm">
                  <p className="font-medium text-foreground">Character Atlas</p>
                  <p className="mt-1 text-sm">
                    Track arcs, relationships, and development beats in real time.
                  </p>
                </li>
                <li className="rounded-lg border bg-card/60 p-4 shadow-sm">
                  <p className="font-medium text-foreground">Beat Sheet Builder</p>
                  <p className="mt-1 text-sm">
                    Plot films, novels, and TV scripts with adaptive templates.
                  </p>
                </li>
                <li className="rounded-lg border bg-card/60 p-4 shadow-sm">
                  <p className="font-medium text-foreground">Outline Intelligence</p>
                  <p className="mt-1 text-sm">
                    Let AI surface risks, pacing issues, and next-step suggestions.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mt-24 space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-semibold sm:text-4xl">Built for ambitious storytellers</h2>
            <p className="mt-4 text-muted-foreground">
              From first draft to final polish, Ottowrite keeps your creative momentum alive.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featureHighlights.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl border bg-card/70 p-6 shadow-sm transition hover:shadow-md">
                <div className="inline-flex rounded-full bg-secondary p-3 text-secondary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow */}
        <section className="mt-24 rounded-3xl border bg-card/60 p-8 shadow-md md:p-12">
          <h2 className="text-2xl font-semibold md:text-3xl">A workflow that mirrors your creative process</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {workflowSteps.map((step) => (
              <div key={step.title} className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {step.title}
                </p>
                <p className="text-base text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="mt-24 space-y-8">
          <div className="flex items-center gap-3">
            <Quote className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold md:text-3xl">Trusted by working writers</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((testimonial) => (
              <blockquote key={testimonial.author} className="rounded-2xl border bg-card/70 p-6 shadow-sm">
                <p className="text-base leading-relaxed text-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
                <footer className="mt-4 text-sm font-medium text-muted-foreground">
                  {testimonial.author} &mdash; {testimonial.role}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-24 rounded-3xl bg-primary px-8 py-12 text-primary-foreground shadow-lg md:px-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold md:text-3xl">Bring your next story to life</h2>
              <p className="max-w-xl text-primary-foreground/90">
                Join thousands of authors, screenwriters, and game designers shaping their worlds with Ottowrite.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" size="lg" asChild>
                <Link href="/auth/signup">Start for Free</Link>
              </Button>
              <Button variant="ghost" size="lg" className="text-primary-foreground hover:text-primary" asChild>
                <Link href="/contact">Talk to Sales</Link>
              </Button>
            </div>
          </div>
        </section>

        <footer className="mt-16 flex flex-col gap-4 border-t pt-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Ottowrite. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/docs" className="hover:text-foreground">
              Documentation
            </Link>
          </div>
        </footer>
      </div>
    </main>
  )
}
