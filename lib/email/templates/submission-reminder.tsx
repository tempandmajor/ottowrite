/**
 * Submission Reminder Email Template
 *
 * Sent as a periodic reminder about pending submissions that haven&apos;t received responses.
 */

import * as React from 'react'
import { BaseEmail, emailStyles } from './base-email'

interface SubmissionReminderEmailProps {
  userName: string
  manuscriptTitle: string
  partnerName: string
  submittedAt: string
  daysSinceSubmission: number
  lastActivity?: string
  submissionUrl: string
}

export function SubmissionReminderEmail({
  userName,
  partnerName,
  manuscriptTitle,
  submittedAt,
  daysSinceSubmission,
  lastActivity,
  submissionUrl,
}: SubmissionReminderEmailProps) {
  return (
    <BaseEmail previewText={`Reminder: Your submission to ${partnerName}`}>
      <h2 style={emailStyles.heading}>📋 Submission Status Update</h2>

      <p style={emailStyles.paragraph}>Hi {userName},</p>

      <p style={emailStyles.paragraph}>
        This is a friendly reminder about your submission of <strong>&quot;{manuscriptTitle}&quot;</strong> to{' '}
        <strong>{partnerName}</strong>.
      </p>

      <div
        style={{
          backgroundColor: '#f6f9fc',
          border: '1px solid #d9e2ec',
          borderRadius: '6px',
          padding: '16px',
          margin: '16px 0',
        }}
      >
        <p style={{ ...emailStyles.paragraph, margin: '0 0 8px' }}>
          <strong>Submitted:</strong> {submittedAt}
        </p>
        <p style={{ ...emailStyles.paragraph, margin: '0 0 8px' }}>
          <strong>Days since submission:</strong> {daysSinceSubmission}
        </p>
        {lastActivity && (
          <p style={{ ...emailStyles.paragraph, margin: 0 }}>
            <strong>Last activity:</strong> {lastActivity}
          </p>
        )}
      </div>

      <p style={emailStyles.paragraph}>
        <strong>What to expect:</strong>
      </p>

      <ul style={{ ...emailStyles.paragraph, paddingLeft: '20px' }}>
        <li>Most partners respond within 4-12 weeks</li>
        <li>Some may take longer depending on their review queue</li>
        <li>No response doesn&apos;t necessarily mean a rejection</li>
        <li>You can follow up after 12 weeks if you haven&apos;t heard back</li>
      </ul>

      <a href={submissionUrl} style={emailStyles.button}>
        Check Submission Status
      </a>

      <hr style={emailStyles.divider} />

      <p style={emailStyles.paragraph}>
        <strong>While you wait:</strong>
      </p>

      <ul style={{ ...emailStyles.paragraph, paddingLeft: '20px' }}>
        <li>Continue working on your next project</li>
        <li>Consider submitting to other partners</li>
        <li>Engage with the writing community</li>
        <li>Refine your craft through workshops or courses</li>
      </ul>

      <div
        style={{
          backgroundColor: '#fffaf0',
          border: '1px solid #f6ad55',
          borderRadius: '6px',
          padding: '16px',
          margin: '16px 0',
        }}
      >
        <p style={{ ...emailStyles.paragraph, margin: 0 }}>
          <strong>💡 Tip:</strong> The wait is often the hardest part. Stay productive, keep
          writing, and trust the process. We&apos;ll notify you immediately if there&apos;s any update on this
          submission.
        </p>
      </div>

      <p style={emailStyles.paragraph}>
        Keep up the great work!
        <br />
        The OttoWrite Team
      </p>
    </BaseEmail>
  )
}

export function submissionReminderEmailText({
  userName,
  partnerName,
  manuscriptTitle,
  submittedAt,
  daysSinceSubmission,
  lastActivity,
  submissionUrl,
}: SubmissionReminderEmailProps): string {
  return `
Hi ${userName},

This is a friendly reminder about your submission of &quot;${manuscriptTitle}&quot; to ${partnerName}.

Submitted: ${submittedAt}
Days since submission: ${daysSinceSubmission}
${lastActivity ? `Last activity: ${lastActivity}` : ''}

What to expect:
- Most partners respond within 4-12 weeks
- Some may take longer depending on their review queue
- No response doesn&apos;t necessarily mean a rejection
- You can follow up after 12 weeks if you haven&apos;t heard back

Check submission status: ${submissionUrl}

While you wait:
- Continue working on your next project
- Consider submitting to other partners
- Engage with the writing community
- Refine your craft through workshops or courses

💡 Tip: The wait is often the hardest part. Stay productive, keep writing, and trust the process. We&apos;ll notify you immediately if there&apos;s any update on this submission.

Keep up the great work!
The OttoWrite Team

---
© ${new Date().getFullYear()} OttoWrite. All rights reserved.
  `.trim()
}
