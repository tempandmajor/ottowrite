import { NextRequest } from 'next/server'
import { errorResponses, successResponse, errorResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
})

/**
 * POST /api/contact
 * Send a contact form message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = contactSchema.safeParse(body)
    if (!validation.success) {
      const errors = validation.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      return errorResponses.badRequest('Validation failed', { details: errors })
    }

    const { name, email, subject, message } = validation.data

    // Log contact attempt
    logger.info('Contact form submitted', {
      name,
      email,
      subject,
      operation: 'contact:submit',
    })

    // Send email via your email service
    // For now, we'll just log it since you'll need to configure your email provider
    // You can use services like Resend, SendGrid, or AWS SES

    try {
      // Example using fetch to send email (you'll need to configure this)
      // This is a placeholder - replace with your actual email sending logic

      const emailPayload = {
        from: 'noreply@ottowrite.app',
        to: 'contact@ottowrite.app',
        subject: `Contact Form: ${subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p><small>Sent from Ottowrite contact form</small></p>
        `,
        text: `
New Contact Form Submission

From: ${name} (${email})
Subject: ${subject}

Message:
${message}

---
Sent from Ottowrite contact form
        `,
      }

      // TODO: Implement actual email sending
      // For now, just log the email that would be sent
      logger.info('Contact email would be sent', {
        to: 'contact@ottowrite.app',
        subject: emailPayload.subject,
        from: email,
        operation: 'contact:email',
      })

      // If you have Resend API key configured:
      // const resendApiKey = process.env.RESEND_API_KEY
      // if (resendApiKey) {
      //   const response = await fetch('https://api.resend.com/emails', {
      //     method: 'POST',
      //     headers: {
      //       'Authorization': `Bearer ${resendApiKey}`,
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify(emailPayload),
      //   })
      //
      //   if (!response.ok) {
      //     throw new Error('Failed to send email')
      //   }
      // }

      return successResponse({
        success: true,
        message: 'Thank you for your message. We\'ll get back to you soon!',
      })
    } catch (emailError) {
      logger.error('Failed to send contact email', {
        email,
        operation: 'contact:email_send',
      }, emailError instanceof Error ? emailError : undefined)

      // Still return success to user, but log the error
      return successResponse({
        success: true,
        message: 'Thank you for your message. We\'ll get back to you soon!',
      })
    }
  } catch (error) {
    logger.error('Error processing contact form', {
      operation: 'contact:process',
    }, error instanceof Error ? error : undefined)

    return errorResponse('Failed to send message. Please try again later.', {
      status: 500,
      details: error,
    })
  }
}
