import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, Users, Zap, Heart } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">Ottowrite</Link>
          <div className="flex gap-4">
            <Link href="/auth/login"><Button variant="ghost">Login</Button></Link>
            <Link href="/auth/signup"><Button>Sign Up</Button></Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">About Ottowrite</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Empowering writers with AI-powered tools to craft better stories, faster.
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-12">
          <section>
            <h2 className="text-3xl font-semibold mb-6">Our Mission</h2>
            <p className="text-lg">
              Ottowrite exists to help writers overcome the blank page and bring their stories to life. We believe
              that every writer—whether crafting their first draft or their fiftieth novel—deserves tools that
              enhance creativity without replacing the human touch that makes stories resonate.
            </p>
          </section>

          <section className="grid md:grid-cols-2 gap-8 my-12">
            <div className="border rounded-lg p-6">
              <Sparkles className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">AI-Powered Creativity</h3>
              <p className="text-muted-foreground">
                Our platform leverages state-of-the-art AI models (Claude, GPT-5, DeepSeek) to provide intelligent
                writing assistance, while always keeping you in creative control.
              </p>
            </div>

            <div className="border rounded-lg p-6">
              <Users className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Built for Writers</h3>
              <p className="text-muted-foreground">
                Designed specifically for prose and screenplay writers, with tools for character development, plot
                analysis, world-building, and collaboration.
              </p>
            </div>

            <div className="border rounded-lg p-6">
              <Zap className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Fast & Reliable</h3>
              <p className="text-muted-foreground">
                Built on modern infrastructure (Next.js, Supabase, Vercel) to deliver a fast, responsive writing
                experience with automatic saves and version control.
              </p>
            </div>

            <div className="border rounded-lg p-6">
              <Heart className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Privacy Focused</h3>
              <p className="text-muted-foreground">
                Your stories are yours. We never use your creative content to train AI models, and your work remains
                private and secure.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-6">The Story Behind Ottowrite</h2>
            <p className="text-lg mb-4">
              Ottowrite was born from the frustration of dealing with generic writing tools that weren&apos;t built
              for serious creative work. We wanted something better—a platform that understood the unique needs of
              novelists, screenwriters, and storytellers.
            </p>
            <p className="text-lg">
              We combine the power of AI with thoughtful design to create tools that enhance your creative process
              without getting in the way. From plot analysis to character development, from beat sheets to
              collaboration features, every feature is designed with real writers in mind.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-6">Our Values</h2>
            <ul className="space-y-4 text-lg">
              <li className="flex items-start gap-3">
                <span className="text-primary text-2xl">•</span>
                <div>
                  <strong>Writer-First Design:</strong> Every feature is built to serve writers, not distract them
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary text-2xl">•</span>
                <div>
                  <strong>Privacy & Ownership:</strong> Your creative work belongs to you, period
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary text-2xl">•</span>
                <div>
                  <strong>Continuous Improvement:</strong> We&apos;re constantly adding features based on writer
                  feedback
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary text-2xl">•</span>
                <div>
                  <strong>Transparency:</strong> Clear pricing, honest AI limitations, and open communication
                </div>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-6">Technology Stack</h2>
            <p className="text-lg mb-4">Ottowrite is built with modern, reliable technology:</p>
            <ul className="grid md:grid-cols-2 gap-3">
              <li className="flex items-center gap-2">
                <span className="text-primary">→</span> Next.js 15 for the frontend
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">→</span> Supabase for database & auth
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">→</span> Vercel for hosting
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">→</span> Stripe for payments
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">→</span> Anthropic Claude for AI
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">→</span> OpenAI & DeepSeek for AI diversity
              </li>
            </ul>
          </section>

          <section className="bg-muted/40 rounded-xl p-8 text-center">
            <h2 className="text-3xl font-semibold mb-4">Join Our Community</h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Whether you&apos;re writing your first short story or your tenth novel, Ottowrite is here to help you
              craft better stories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="px-8">
                  Start Writing Free
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="px-8">
                  View Pricing
                </Button>
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-6">Contact Us</h2>
            <p className="text-lg mb-4">
              Have questions, feedback, or just want to say hello? We&apos;d love to hear from you.
            </p>
            <ul className="space-y-3">
              <li>
                <strong>General Inquiries:</strong>{' '}
                <a href="mailto:contact@ottowrite.app" className="text-primary hover:underline">
                  contact@ottowrite.app
                </a>
              </li>
              <li>
                <strong>Support:</strong>{' '}
                <a href="mailto:support@ottowrite.app" className="text-primary hover:underline">
                  support@ottowrite.app
                </a>
              </li>
              <li>
                <strong>Contact Form:</strong>{' '}
                <Link href="/contact" className="text-primary hover:underline">
                  ottowrite.app/contact
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; 2025 Ottowrite. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
              <Link href="/contact" className="hover:text-foreground">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
