import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function CookiePolicyPage() {
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

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 22, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit websites. They help websites remember
              your preferences and provide a better user experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Cookies We Use</h2>

            <h3 className="text-xl font-semibold mb-3">2.1 Essential Cookies (Required)</h3>
            <p>These cookies are necessary for the Service to function:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Authentication:</strong> Keep you logged in securely</li>
              <li><strong>Security:</strong> Protect against CSRF attacks and fraud</li>
              <li><strong>Session Management:</strong> Maintain your session state</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">2.2 Functional Cookies</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Preferences:</strong> Remember your settings (theme, language, editor preferences)</li>
              <li><strong>UI State:</strong> Remember sidebar, panel, and layout configurations</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">2.3 Analytics Cookies</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage Tracking:</strong> Understand how you use the Service</li>
              <li><strong>Performance Monitoring:</strong> Detect errors and improve performance</li>
              <li><strong>Feature Analytics:</strong> Measure feature adoption and usage patterns</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">2.4 Marketing Cookies (With Consent)</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Advertising:</strong> Show relevant ads on third-party platforms</li>
              <li><strong>Conversion Tracking:</strong> Measure marketing campaign effectiveness</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Third-Party Cookies</h2>
            <p>We use services from third parties that may set their own cookies:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Sentry:</strong> Error monitoring</li>
              <li><strong>Analytics Providers:</strong> Usage statistics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
            <p>You can control cookies through:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Browser Settings:</strong> Most browsers allow you to block or delete cookies</li>
              <li><strong>Opt-Out Tools:</strong> Industry opt-out tools for advertising cookies</li>
              <li><strong>Account Settings:</strong> Manage analytics preferences in your account</li>
            </ul>
            <p className="mt-4">
              Note: Blocking essential cookies may prevent the Service from functioning properly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Contact</h2>
            <p>Questions about cookies? Contact us at{' '}
              <a href="mailto:privacy@ottowrite.app" className="text-primary hover:underline">
                privacy@ottowrite.app
              </a>
            </p>
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
