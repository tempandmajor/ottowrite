'use client'

/**
 * API Documentation Page
 *
 * Displays interactive OpenAPI documentation using Swagger UI.
 * Accessible at /api-docs
 */

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import 'swagger-ui-react/swagger-ui.css'

export default function APIDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Dynamically import SwaggerUI to avoid SSR issues
    import('swagger-ui-react').then((SwaggerUI) => {
      const Component = SwaggerUI.default

      if (containerRef.current) {
        // Clear container first
        containerRef.current.innerHTML = ''

        // Create a div for React to render into
        const reactRoot = document.createElement('div')
        containerRef.current.appendChild(reactRoot)

        // Render Swagger UI
        import('react-dom/client').then(({ createRoot }) => {
          const root = createRoot(reactRoot)
          root.render(
            <Component
              url="/openapi.yaml"
              docExpansion="list"
              defaultModelsExpandDepth={1}
              persistAuthorization={true}
              tryItOutEnabled={true}
              filter={true}
              requestInterceptor={(request) => {
                // Add custom headers or modify requests here
                return request
              }}
            />
          )
        })
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">OttoWrite API Documentation</h1>
              <p className="mt-2 text-muted-foreground">
                Comprehensive API reference for the OttoWrite platform
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/openapi.yaml"
                download
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download OpenAPI Spec
              </a>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Back to App
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Links */}
      <div className="border-b bg-muted/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Quick Links:</span>
              <a
                href="#tag/AI"
                className="text-sm text-primary hover:underline"
              >
                AI Generation
              </a>
              <span className="text-muted-foreground">•</span>
              <a
                href="#tag/Characters"
                className="text-sm text-primary hover:underline"
              >
                Characters
              </a>
              <span className="text-muted-foreground">•</span>
              <a
                href="#tag/Projects"
                className="text-sm text-primary hover:underline"
              >
                Projects
              </a>
              <span className="text-muted-foreground">•</span>
              <a
                href="#tag/Webhooks"
                className="text-sm text-primary hover:underline"
              >
                Webhooks
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold">Authentication</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Use Supabase JWT tokens in the Authorization header:
              </p>
              <code className="mt-2 block rounded bg-muted px-2 py-1 text-xs">
                Authorization: Bearer &lt;token&gt;
              </code>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold">Rate Limiting</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                API endpoints have rate limits:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>• AI: 50 req/hour</li>
                <li>• Write: 100 req/hour</li>
                <li>• Read: 1000 req/hour</li>
              </ul>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold">Hybrid AI Models</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Supported models:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>• Claude Sonnet 4.5 (Anthropic)</li>
                <li>• GPT-5 + Responses API (OpenAI)</li>
                <li>• DeepSeek V3.1-Terminus</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Swagger UI Container */}
      <div ref={containerRef} className="swagger-container" />

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              <p>© 2025 OttoWrite. All rights reserved.</p>
            </div>
            <div className="flex gap-4">
              <a href="/support" className="hover:text-foreground">
                Support
              </a>
              <a href="/privacy" className="hover:text-foreground">
                Privacy
              </a>
              <a href="/terms" className="hover:text-foreground">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
