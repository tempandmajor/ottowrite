import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function DMCAPage() {
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
        <h1 className="text-4xl font-bold mb-4">DMCA Copyright Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 22, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Copyright Infringement Notification</h2>
            <p>
              Ottowrite respects the intellectual property rights of others and expects users to do the same. In
              accordance with the Digital Millennium Copyright Act (DMCA), we will respond to notices of alleged
              copyright infringement that comply with the DMCA and other applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Filing a DMCA Takedown Notice</h2>
            <p>
              If you believe that content on Ottowrite infringes your copyright, please send a written notice to our
              designated Copyright Agent with the following information:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">Required Information:</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>
                <strong>Identification of the copyrighted work</strong> that you claim has been infringed. If multiple
                works are covered by a single notification, provide a representative list.
              </li>
              <li>
                <strong>Identification of the infringing material</strong> and information reasonably sufficient to
                permit us to locate the material (e.g., URL, account username, document ID).
              </li>
              <li>
                <strong>Your contact information</strong> including name, address, telephone number, and email address.
              </li>
              <li>
                <strong>A statement</strong> that you have a good faith belief that use of the material is not
                authorized by the copyright owner, its agent, or the law.
              </li>
              <li>
                <strong>A statement</strong> that the information in the notification is accurate, and under penalty of
                perjury, that you are authorized to act on behalf of the copyright owner.
              </li>
              <li>
                <strong>Your physical or electronic signature.</strong>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Submit DMCA Notice</h2>
            <p>Send your DMCA notice to our designated Copyright Agent:</p>
            <div className="bg-muted/40 rounded-lg p-6 mt-4">
              <p className="font-semibold">Copyright Agent</p>
              <p>Ottowrite, Inc.</p>
              <p>Email: <a href="mailto:dmca@ottowrite.app" className="text-primary hover:underline">
                dmca@ottowrite.app
              </a></p>
              <p className="mt-2 text-sm text-muted-foreground">
                Please include &quot;DMCA Takedown Notice&quot; in the subject line
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. What Happens After We Receive a Notice</h2>
            <p>Upon receiving a valid DMCA takedown notice, we will:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Remove or disable access to the allegedly infringing material</li>
              <li>Notify the user who posted the material about the removal</li>
              <li>Provide the user with a copy of your notice</li>
              <li>Take appropriate action against repeat infringers, including account termination</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Counter-Notice</h2>
            <p>
              If you believe your content was removed in error, you may file a counter-notice with the following
              information:
            </p>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Your physical or electronic signature</li>
              <li>Identification of the material that was removed and its location before removal</li>
              <li>
                A statement under penalty of perjury that you have a good faith belief the material was removed as a
                result of mistake or misidentification
              </li>
              <li>
                Your name, address, and telephone number, and a statement that you consent to the jurisdiction of
                Federal District Court for the judicial district in which your address is located
              </li>
              <li>
                A statement that you will accept service of process from the person who provided the original DMCA
                notice
              </li>
            </ol>
            <p className="mt-4">
              Send counter-notices to: <a href="mailto:dmca@ottowrite.app" className="text-primary hover:underline">
                dmca@ottowrite.app
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Repeat Infringer Policy</h2>
            <p>
              We have a policy of terminating, in appropriate circumstances, the accounts of users who are repeat
              infringers of intellectual property rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. False Claims</h2>
            <p>
              Please be aware that under Section 512(f) of the DMCA, you may be liable for damages if you knowingly
              materially misrepresent that material or activity is infringing. Additionally, filing a false
              counter-notice may result in liability for damages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Other Concerns</h2>
            <p>
              If you have concerns about content on Ottowrite that don&apos;t involve copyright, please see our{' '}
              <Link href="/acceptable-use" className="text-primary hover:underline">Acceptable Use Policy</Link> or
              contact us at{' '}
              <a href="mailto:abuse@ottowrite.app" className="text-primary hover:underline">
                abuse@ottowrite.app
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
