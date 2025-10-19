import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ottowrite - AI-Powered Writing Assistant',
  description:
    'Write better and faster with Ottowrite. The intelligent writing assistant for novelists, screenwriters, and content creators.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} font-sans`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
