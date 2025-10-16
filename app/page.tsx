import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold">OttoWrite</h1>
        <p className="text-xl text-muted-foreground">
          AI-Powered Writing Assistant
        </p>
        <p className="text-sm text-muted-foreground max-w-md">
          Write better and faster with intelligent AI assistance for novels, screenplays, and more.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Button asChild>
            <Link href="/auth/signup">Get Started</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/auth/login">Login</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
