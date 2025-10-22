import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PrivacyPolicyPage() {
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
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 22, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              Ottowrite (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our AI-powered
              writing platform (&quot;the Service&quot;).
            </p>
            <p>
              By using the Service, you consent to the data practices described in this policy. If you do not agree
              with this policy, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account Information:</strong> Name, email address, password, and profile information when you
                create an account
              </li>
              <li>
                <strong>Payment Information:</strong> Billing address and payment method details (processed securely
                through Stripe)
              </li>
              <li>
                <strong>User Content:</strong> Documents, text, characters, plots, and other creative content you
                create or upload
              </li>
              <li>
                <strong>Communications:</strong> Messages you send us through contact forms, email, or support channels
              </li>
              <li>
                <strong>Preferences:</strong> Writing preferences, genre interests, and other customization settings
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Usage Data:</strong> Pages visited, features used, time spent, and interaction patterns
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, operating system, IP address, and device identifiers
              </li>
              <li>
                <strong>Cookies:</strong> Session cookies, authentication tokens, and preference cookies (see our{' '}
                <Link href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>)
              </li>
              <li>
                <strong>AI Usage Metrics:</strong> Number of AI requests, tokens used, models selected, and generation
                results
              </li>
              <li>
                <strong>Performance Data:</strong> Error logs, crash reports, and diagnostic information
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">2.3 Information from Third Parties</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Authentication Providers:</strong> If you sign in through third-party services (Google, etc.)
              </li>
              <li>
                <strong>Payment Processors:</strong> Transaction confirmations and subscription status from Stripe
              </li>
              <li>
                <strong>Analytics Services:</strong> Aggregated usage statistics from analytics tools
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p>We use collected information for the following purposes:</p>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.1 Provide and Improve the Service</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Create and manage your account</li>
              <li>Process AI writing requests and generate content</li>
              <li>Store and sync your documents across devices</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Improve AI models and writing suggestions</li>
              <li>Develop new features and enhance existing ones</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.2 Process Payments</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Process subscription payments and manage billing</li>
              <li>Send transaction confirmations and receipts</li>
              <li>Detect and prevent fraud</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.3 Communications</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Send service-related notifications and updates</li>
              <li>Respond to your questions and support requests</li>
              <li>Send marketing emails (with your consent, opt-out available)</li>
              <li>Notify you of changes to Terms or Privacy Policy</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.4 Security and Compliance</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Protect against security threats and fraud</li>
              <li>Comply with legal obligations and court orders</li>
              <li>Enforce our Terms of Service</li>
              <li>Monitor for violations of our Acceptable Use Policy</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.5 Analytics and Research</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Analyze usage patterns and trends</li>
              <li>Conduct research to improve AI performance</li>
              <li>Generate anonymized statistics about platform usage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. AI and Your Content</h2>

            <h3 className="text-xl font-semibold mb-3">4.1 How We Use Your Content</h3>
            <p>
              Your creative content (documents, characters, plots, etc.) is used solely to provide the Service to you.
              We process your content through our AI models to generate suggestions, continuations, and assistance.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">4.2 AI Training</h3>
            <p>
              <strong>We do NOT use your creative content to train our AI models.</strong> Your stories, characters,
              and creative work remain private and are never used to improve AI models that serve other users.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">4.3 Third-Party AI Providers</h3>
            <p>
              We use third-party AI services (Anthropic Claude, OpenAI, DeepSeek). These providers process your
              prompts and content to generate responses but do not retain or train on your data per their enterprise
              agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. How We Share Your Information</h2>
            <p>We do not sell your personal information. We may share information in these circumstances:</p>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.1 Service Providers</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cloud hosting providers (Supabase, Vercel)</li>
              <li>Payment processors (Stripe)</li>
              <li>AI service providers (Anthropic, OpenAI, DeepSeek)</li>
              <li>Email service providers</li>
              <li>Analytics providers (with anonymized data)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.2 Collaboration Features</h3>
            <p>
              When you use team or collaboration features, your content may be shared with other users you explicitly
              invite to collaborate on specific projects or documents.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.3 Legal Requirements</h3>
            <p>We may disclose information if required by law or in response to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Court orders or subpoenas</li>
              <li>Legal processes or government requests</li>
              <li>Protection of our rights or property</li>
              <li>Investigation of fraud or security issues</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.4 Business Transfers</h3>
            <p>
              If we are involved in a merger, acquisition, or sale of assets, your information may be transferred to
              the new entity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
            <p>We implement industry-standard security measures to protect your information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption in transit (TLS/SSL) and at rest</li>
              <li>Secure authentication and password hashing</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and employee training</li>
              <li>Automated backups and disaster recovery</li>
              <li>Monitoring for suspicious activity and breaches</li>
            </ul>
            <p className="mt-4">
              However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute
              security of your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide the Service. You
              may request deletion of your account and data at any time.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account Data:</strong> Retained until you request account deletion
              </li>
              <li>
                <strong>User Content:</strong> Retained until you delete it or close your account
              </li>
              <li>
                <strong>Usage Logs:</strong> Typically retained for 90 days, unless required longer for security or
                legal reasons
              </li>
              <li>
                <strong>Billing Records:</strong> Retained for 7 years for tax and accounting purposes
              </li>
              <li>
                <strong>Support Tickets:</strong> Retained for 3 years after resolution
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Your Privacy Rights</h2>

            <h3 className="text-xl font-semibold mb-3">8.1 Access and Portability</h3>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal information</li>
              <li>Export your content in standard formats</li>
              <li>Request a copy of your data</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">8.2 Correction and Deletion</h3>
            <p>You may:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Update your account information at any time</li>
              <li>Delete documents and content you create</li>
              <li>Request deletion of your entire account</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">8.3 Marketing Communications</h3>
            <p>You can opt out of marketing emails by:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Clicking &quot;unsubscribe&quot; in any marketing email</li>
              <li>Adjusting preferences in your account settings</li>
              <li>Contacting us directly</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">8.4 GDPR Rights (EU Users)</h3>
            <p>If you are in the European Union, you have additional rights:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to erasure (&quot;right to be forgotten&quot;)</li>
              <li>Right to restriction of processing</li>
              <li>Right to object to processing</li>
              <li>Right to lodge a complaint with a supervisory authority</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">8.5 CCPA Rights (California Users)</h3>
            <p>California residents have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Know what personal information is collected</li>
              <li>Know whether personal information is sold or disclosed</li>
              <li>Opt out of the sale of personal information (we do not sell)</li>
              <li>Request deletion of personal information</li>
              <li>Non-discrimination for exercising rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence.
              We ensure adequate safeguards are in place for international data transfers through:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Standard Contractual Clauses approved by the European Commission</li>
              <li>Data processing agreements with service providers</li>
              <li>Compliance with Privacy Shield principles (where applicable)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for users under 13 years of age. We do not knowingly collect personal
              information from children under 13. If we discover we have collected information from a child under 13,
              we will delete it immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to provide and improve the Service. For detailed
              information about our use of cookies, please see our{' '}
              <Link href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>.
            </p>
            <p className="mt-4">You can control cookies through your browser settings.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by email or
              through the Service. The &quot;Last Updated&quot; date at the top indicates when the policy was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p>If you have questions or concerns about this Privacy Policy, please contact us:</p>
            <ul className="list-none space-y-2 mt-4">
              <li>
                Email:{' '}
                <a href="mailto:privacy@ottowrite.app" className="text-primary hover:underline">
                  privacy@ottowrite.app
                </a>
              </li>
              <li>
                Contact Form:{' '}
                <Link href="/contact" className="text-primary hover:underline">
                  ottowrite.app/contact
                </Link>
              </li>
            </ul>
            <p className="mt-4">
              For GDPR-related requests, please email:{' '}
              <a href="mailto:dpo@ottowrite.app" className="text-primary hover:underline">
                dpo@ottowrite.app
              </a>
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; 2025 Ottowrite. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
