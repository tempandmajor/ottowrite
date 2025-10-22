import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function RefundPolicyPage() {
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
        <h1 className="text-4xl font-bold mb-4">Refund & Cancellation Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 22, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. 7-Day Money-Back Guarantee</h2>
            <p>
              We offer a 7-day money-back guarantee on all paid subscriptions. If you&apos;re not satisfied with
              Ottowrite for any reason, you can request a full refund within 7 days of your initial subscription
              purchase.
            </p>
            <h3 className="text-xl font-semibold mb-3 mt-4">Conditions:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Applies to first-time subscribers only (one per customer)</li>
              <li>Request must be made within 7 days of initial payment</li>
              <li>Refund is for the first billing cycle only</li>
              <li>No questions asked - we&apos;ll process your refund promptly</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How to Request a Refund</h2>
            <p>To request a refund:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Email <a href="mailto:billing@ottowrite.app" className="text-primary hover:underline">
                billing@ottowrite.app
              </a> with your account email</li>
              <li>Include &quot;Refund Request&quot; in the subject line</li>
              <li>We&apos;ll process your request within 1-2 business days</li>
              <li>Refunds typically appear in 5-10 business days depending on your payment method</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Cancellation Policy</h2>
            <h3 className="text-xl font-semibold mb-3">3.1 Monthly Subscriptions</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>You can cancel anytime through your account settings or billing portal</li>
              <li>Access continues until the end of your current billing period</li>
              <li>No refunds for partial months after the 7-day guarantee period</li>
              <li>Cancellation takes effect at the end of the current billing cycle</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.2 How to Cancel</h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Log in to your account</li>
              <li>Go to Settings → Plan & Usage</li>
              <li>Click &quot;Manage Subscription&quot;</li>
              <li>Select &quot;Cancel Subscription&quot;</li>
              <li>Confirm cancellation</li>
            </ol>
            <p className="mt-4">
              Alternatively, you can manage your subscription through the Stripe customer portal link sent in your
              billing emails.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. What Happens After Cancellation</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You retain access until the end of your paid period</li>
              <li>Your documents and content remain available in read-only mode</li>
              <li>You can export all your content before downgrading</li>
              <li>Account automatically downgrades to Free plan (if available)</li>
              <li>Free plan limitations apply after paid period ends</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Refunds Outside 7-Day Window</h2>
            <p>After the 7-day guarantee period, refunds are generally not provided. Exceptions may be made for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Technical Issues:</strong> If the Service was unavailable for extended periods</li>
              <li><strong>Billing Errors:</strong> If you were charged incorrectly</li>
              <li><strong>Extenuating Circumstances:</strong> Evaluated on a case-by-case basis</li>
            </ul>
            <p className="mt-4">
              Contact <a href="mailto:billing@ottowrite.app" className="text-primary hover:underline">
                billing@ottowrite.app
              </a> to discuss your situation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Upgrades and Downgrades</h2>
            <h3 className="text-xl font-semibold mb-3">6.1 Upgrades</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Take effect immediately</li>
              <li>Prorated credit applied for unused portion of previous plan</li>
              <li>New plan features available right away</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">6.2 Downgrades</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Take effect at the end of current billing cycle</li>
              <li>No refunds for the difference in price</li>
              <li>Ensure your usage fits within new plan limits before downgrading</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Failed Payments</h2>
            <p>If a payment fails:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>We&apos;ll attempt to charge your payment method up to 3 times</li>
              <li>You&apos;ll receive email notifications about failed payments</li>
              <li>After 3 failed attempts, your account will be downgraded to Free plan</li>
              <li>You can update your payment method to restore access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Account Deletion</h2>
            <p>
              If you want to delete your account entirely (not just cancel subscription):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Go to Settings → Account → Delete Account</li>
              <li>Export your content first - deletion is permanent</li>
              <li>All your documents and data will be permanently deleted</li>
              <li>This action cannot be undone</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact</h2>
            <p>Questions about refunds or cancellations?</p>
            <ul className="list-none space-y-2 mt-4">
              <li>Email: <a href="mailto:billing@ottowrite.app" className="text-primary hover:underline">
                billing@ottowrite.app
              </a></li>
              <li>Contact Form: <Link href="/contact" className="text-primary hover:underline">
                ottowrite.app/contact
              </Link></li>
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
