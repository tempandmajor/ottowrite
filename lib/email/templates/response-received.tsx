/**
 * Response Received Email Template
 *
 * Sent when a partner sends a general response or feedback about the submission.
 */

import * as React from 'react'
import { BaseEmail, emailStyles } from './base-email'

interface ResponseReceivedEmailProps {
  userName: string
  partnerName: string
  manuscriptTitle: string
  responseSnippet: string
  receivedAt: string
  submissionUrl: string
}

export function ResponseReceivedEmail({
  userName,
  partnerName,
  manuscriptTitle,
  responseSnippet,
  receivedAt,
  submissionUrl,
}: ResponseReceivedEmailProps) {
  return (
    <BaseEmail previewText={`${partnerName} sent you a response`}>
      <h2 style={emailStyles.heading}>💬 New Response Received</h2>

      <p style={emailStyles.paragraph}>Hi {userName},</p>

      <p style={emailStyles.paragraph}>
        <strong>{partnerName}</strong> has sent you a response regarding your submission of{' '}
        <strong>&quot;{manuscriptTitle}&quot;</strong>.
      </p>

      <div style={emailStyles.success}>
        <p style={emailStyles.successText}>
          <strong>Received:</strong> {receivedAt}
        </p>
      </div>

      <p style={{ ...emailStyles.label, marginTop: '24px' }}>Response Preview:</p>
      <div
        style={{
          backgroundColor: '#f6f9fc',
          border: '1px solid #d9e2ec',
          borderRadius: '6px',
          padding: '16px',
          margin: '8px 0 24px',
        }}
      >
        <p style={{ ...emailStyles.paragraph, margin: 0, fontStyle: 'italic' }}>
          {responseSnippet}...
        </p>
      </div>

      <a href={submissionUrl} style={emailStyles.button}>
        Read Full Response
      </a>

      <hr style={emailStyles.divider} />

      <p style={emailStyles.paragraph}>
        Review the complete message in your submission dashboard. If the partner has questions or
        requests, respond promptly and professionally.
      </p>

      <p style={emailStyles.paragraph}>
        Best regards,
        <br />
        The OttoWrite Team
      </p>
    </BaseEmail>
  )
}

export function responseReceivedEmailText({
  userName,
  partnerName,
  manuscriptTitle,
  responseSnippet,
  receivedAt,
  submissionUrl,
}: ResponseReceivedEmailProps): string {
  return `
Hi ${userName},

${partnerName} has sent you a response regarding your submission of &quot;${manuscriptTitle}&quot;.

Received: ${receivedAt}

Response Preview:
"${responseSnippet}..."

Read the full response: ${submissionUrl}

Review the complete message in your submission dashboard. If the partner has questions or requests, respond promptly and professionally.

Best regards,
The OttoWrite Team

---
© ${new Date().getFullYear()} OttoWrite. All rights reserved.
  `.trim()
}
