/**
 * Partner Viewed Manuscript Email Template
 *
 * Sent when a partner/agent opens and views the manuscript submission.
 */

import * as React from 'react'
import { BaseEmail, emailStyles } from './base-email'

interface PartnerViewedEmailProps {
  userName: string
  partnerName: string
  manuscriptTitle: string
  viewedAt: string
  submissionUrl: string
}

export function PartnerViewedEmail({
  userName,
  partnerName,
  manuscriptTitle,
  viewedAt,
  submissionUrl,
}: PartnerViewedEmailProps) {
  return (
    <BaseEmail previewText={`${partnerName} viewed &quot;${manuscriptTitle}&quot;`}>
      <h2 style={emailStyles.heading}>Your submission has been viewed! 👀</h2>

      <p style={emailStyles.paragraph}>Hi {userName},</p>

      <p style={emailStyles.paragraph}>
        Great news! <strong>{partnerName}</strong> has opened and viewed your manuscript submission
        for <strong>&quot;{manuscriptTitle}&quot;</strong>.
      </p>

      <div style={emailStyles.success}>
        <p style={emailStyles.successText}>
          <strong>Viewed:</strong> {viewedAt}
        </p>
      </div>

      <p style={emailStyles.paragraph}>
        This is a positive sign that they&apos;re interested in learning more about your work. Partners
        typically review submissions within 1-2 weeks after viewing.
      </p>

      <a href={submissionUrl} style={emailStyles.button}>
        View Submission Details
      </a>

      <hr style={emailStyles.divider} />

      <p style={emailStyles.paragraph}>
        <strong>What happens next?</strong>
      </p>

      <ul style={{ ...emailStyles.paragraph, paddingLeft: '20px' }}>
        <li>The partner may request additional materials (sample chapters, full manuscript)</li>
        <li>They may send you questions or feedback</li>
        <li>You&apos;ll receive notifications for any updates</li>
      </ul>

      <p style={emailStyles.paragraph}>
        Stay patient and keep working on your craft. We&apos;ll notify you of any further activity.
      </p>

      <p style={emailStyles.paragraph}>
        Best regards,
        <br />
        The OttoWrite Team
      </p>
    </BaseEmail>
  )
}

/**
 * Generate plain text version for email clients that don&apos;t support HTML
 */
export function partnerViewedEmailText({
  userName,
  partnerName,
  manuscriptTitle,
  viewedAt,
  submissionUrl,
}: PartnerViewedEmailProps): string {
  return `
Hi ${userName},

Great news! ${partnerName} has opened and viewed your manuscript submission for &quot;${manuscriptTitle}&quot;.

Viewed: ${viewedAt}

This is a positive sign that they&apos;re interested in learning more about your work. Partners typically review submissions within 1-2 weeks after viewing.

View submission details: ${submissionUrl}

What happens next?
- The partner may request additional materials (sample chapters, full manuscript)
- They may send you questions or feedback
- You&apos;ll receive notifications for any updates

Stay patient and keep working on your craft. We&apos;ll notify you of any further activity.

Best regards,
The OttoWrite Team

---
© ${new Date().getFullYear()} OttoWrite. All rights reserved.
  `.trim()
}
