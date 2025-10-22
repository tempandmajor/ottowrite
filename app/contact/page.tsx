'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, MessageSquare, Send, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ContactPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send message')
      }

      toast({
        title: 'Message sent!',
        description: data.message || 'We\'ll get back to you soon.',
      })

      // Reset form
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen bg-background">
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

      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Have questions, feedback, or need help? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Us
                </CardTitle>
                <CardDescription>Send us an email directly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium">General Inquiries</p>
                  <a
                    href="mailto:contact@ottowrite.app"
                    className="text-sm text-primary hover:underline"
                  >
                    contact@ottowrite.app
                  </a>
                </div>
                <div>
                  <p className="text-sm font-medium">Support</p>
                  <a
                    href="mailto:support@ottowrite.app"
                    className="text-sm text-primary hover:underline"
                  >
                    support@ottowrite.app
                  </a>
                </div>
                <div>
                  <p className="text-sm font-medium">Business</p>
                  <a
                    href="mailto:business@ottowrite.app"
                    className="text-sm text-primary hover:underline"
                  >
                    business@ottowrite.app
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Other Ways to Reach Us
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Legal</p>
                  <a
                    href="mailto:legal@ottowrite.app"
                    className="text-sm text-primary hover:underline"
                  >
                    legal@ottowrite.app
                  </a>
                </div>
                <div>
                  <p className="text-sm font-medium">Privacy</p>
                  <a
                    href="mailto:privacy@ottowrite.app"
                    className="text-sm text-primary hover:underline"
                  >
                    privacy@ottowrite.app
                  </a>
                </div>
                <div>
                  <p className="text-sm font-medium">DMCA</p>
                  <a
                    href="mailto:dmca@ottowrite.app"
                    className="text-sm text-primary hover:underline"
                  >
                    dmca@ottowrite.app
                  </a>
                </div>
              </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Response Time</p>
              <p>
                We typically respond within 24-48 hours during business days. For urgent issues, please
                email support@ottowrite.app directly.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>
                  Fill out the form below and we&apos;ll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        required
                        minLength={2}
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="What is this about?"
                      required
                      minLength={5}
                      maxLength={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us more about your question or feedback..."
                      rows={8}
                      required
                      minLength={10}
                      maxLength={5000}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.message.length} / 5000 characters
                    </p>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full md:w-auto px-8">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
              <Link href="/about" className="hover:text-foreground">
                About
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
