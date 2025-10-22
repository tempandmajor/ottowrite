import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AcceptableUsePage() {
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
        <h1 className="text-4xl font-bold mb-4">Acceptable Use Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 22, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Purpose</h2>
            <p>
              This Acceptable Use Policy outlines prohibited conduct when using Ottowrite. By using the Service, you
              agree not to engage in any of the activities listed below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Prohibited Content</h2>
            <p>You may not use the Service to create, store, or share content that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Illegal Content:</strong> Violates any applicable laws or regulations</li>
              <li><strong>Harmful Content:</strong> Promotes violence, terrorism, or harm to others</li>
              <li><strong>Hate Speech:</strong> Promotes discrimination, hatred, or violence based on race, religion,
                gender, sexual orientation, disability, or other protected characteristics</li>
              <li><strong>Child Exploitation:</strong> Involves minors in sexual or exploitative content (zero
                tolerance)</li>
              <li><strong>Harassment:</strong> Bullies, threatens, or harasses individuals or groups</li>
              <li><strong>Misinformation:</strong> Deliberately spreads false information that could cause harm</li>
              <li><strong>Spam:</strong> Unsolicited commercial content or repetitive messages</li>
              <li><strong>Malware:</strong> Contains viruses, malware, or harmful code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Prohibited Activities</h2>
            <p>You may not:</p>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.1 System Abuse</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Attempt to gain unauthorized access to our systems or other users&apos; accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Bypass security measures or access controls</li>
              <li>Conduct penetration testing without prior written approval</li>
              <li>Use automated systems (bots, scrapers) without authorization</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.2 Intellectual Property Violations</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Infringe copyrights, trademarks, or other intellectual property rights</li>
              <li>Use the Service to plagiarize or pass off others&apos; work as your own</li>
              <li>Reverse engineer or decompile the Service</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.3 Misuse of AI Features</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Attempt to manipulate or &quot;jailbreak&quot; AI models</li>
              <li>Generate content designed to train competing AI systems</li>
              <li>Use AI to impersonate real individuals without consent</li>
              <li>Generate deepfakes or misleading synthetic media</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.4 Commercial Misuse</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Resell or redistribute the Service without authorization</li>
              <li>Use the Service for unauthorized commercial purposes</li>
              <li>Share account credentials with multiple users</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.5 Abuse of Resources</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Excessive API usage beyond rate limits</li>
              <li>Creating multiple accounts to circumvent usage limits</li>
              <li>Using the Service in a way that degrades performance for others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Reporting Violations</h2>
            <p>If you encounter content or behavior that violates this policy, please report it:</p>
            <ul className="list-none space-y-2">
              <li>Email: <a href="mailto:abuse@ottowrite.app" className="text-primary hover:underline">
                abuse@ottowrite.app
              </a></li>
              <li>Contact Form: <Link href="/contact" className="text-primary hover:underline">
                ottowrite.app/contact
              </Link></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Consequences of Violations</h2>
            <p>Violations of this policy may result in:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Warning:</strong> First-time minor violations may receive a warning</li>
              <li><strong>Content Removal:</strong> Removal of violating content</li>
              <li><strong>Feature Restrictions:</strong> Temporary or permanent restriction of certain features</li>
              <li><strong>Account Suspension:</strong> Temporary suspension of account access</li>
              <li><strong>Account Termination:</strong> Permanent account closure for serious or repeated violations
              </li>
              <li><strong>Legal Action:</strong> Referral to law enforcement for illegal activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Appeals</h2>
            <p>
              If your account is suspended or terminated, you may appeal the decision by contacting us at{' '}
              <a href="mailto:appeals@ottowrite.app" className="text-primary hover:underline">
                appeals@ottowrite.app
              </a>
              {' '}with your account details and explanation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Changes to This Policy</h2>
            <p>
              We may update this policy at any time. Continued use of the Service after changes constitutes acceptance
              of the updated policy.
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
