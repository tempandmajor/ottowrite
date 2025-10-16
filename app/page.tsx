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
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
            Get Started
          </button>
          <button className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </main>
  )
}
