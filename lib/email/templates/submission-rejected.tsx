/**
 * Submission Rejected Email Template
 *
 * Sent when a partner declines the submission.
 */

import * as React from 'react'
import { BaseEmail, emailStyles } from './base-email'

interface SubmissionRejectedEmailProps {
  userName: string
  partnerName: string
  manuscriptTitle: string
  rejectedAt: string
  submissionUrl: string
  feedback?: string
}

export function SubmissionRejectedEmail({
  userName,
  partnerName,
  manuscriptTitle,
  rejectedAt,
  submissionUrl,
  feedback,
}: SubmissionRejectedEmailProps) {
  return (
    <BaseEmail previewText={`Update on your submission to ${partnerName}`}>
      <h2 style={emailStyles.heading}>Submission Update</h2>

      <p style={emailStyles.paragraph}>Hi {userName},</p>

      <p style={emailStyles.paragraph}>
        We wanted to let you know that <strong>{partnerName}</strong> has decided not to move
        forward with <strong>&quot;{manuscriptTitle}&quot;</strong> at this time.
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
        <p style={{ ...emailStyles.paragraph, margin: 0 }}>
          <strong>Decision Date:</strong> {rejectedAt}
        </p>
      </div>

      {feedback && (
        <>
          <p style={{ ...emailStyles.label, marginTop: '24px' }}>Feedback from {partnerName}:</p>
          <div
            style={{
              backgroundColor: '#fffaf0',
              border: '1px solid #f6ad55',
              borderRadius: '6px',
              padding: '16px',
              margin: '8px 0 24px',
            }}
          >
            <p style={{ ...emailStyles.paragraph, margin: 0 }}>{feedback}</p>
          </div>
        </>
      )}

      <hr style={emailStyles.divider} />

      <p style={emailStyles.paragraph}>
        <strong>Remember:</strong> Rejection is a normal part of the publishing process. Many
        bestselling authors received numerous rejections before finding the right partner.
      </p>

      <div
        style={{
          backgroundColor: '#f0fff4',
          border: '1px solid #68d391',
          borderRadius: '6px',
          padding: '16px',
          margin: '16px 0',
        }}
      >
        <p style={{ ...emailStyles.paragraph, margin: '0 0 12px' }}>
          <strong>Keep Moving Forward:</strong>
        </p>
        <ul style={{ ...emailStyles.paragraph, margin: 0, paddingLeft: '20px' }}>
          <li>This is one partner&apos;s opinion, not a judgment of your work&apos;s value</li>
          <li>Consider any feedback provided and use it to strengthen your manuscript</li>
          <li>Keep submitting to other partners who might be a better fit</li>
          <li>Continue writing and refining your craft</li>
        </ul>
      </div>

      <a href={submissionUrl} style={emailStyles.button}>
        View Submission Details
      </a>

      <a
        href="{{app_url}}/submissions/new"
        style={{ ...emailStyles.buttonSecondary, marginLeft: '12px' }}
      >
        Submit to Another Partner
      </a>

      <hr style={emailStyles.divider} />

      <p style={emailStyles.paragraph}>
        <strong>Success Stories:</strong>
      </p>

      <ul style={{ ...emailStyles.paragraph, paddingLeft: '20px' }}>
        <li>J.K. Rowling: Harry Potter was rejected 12 times</li>
        <li>Stephen King: Carrie was rejected 30 times</li>
        <li>Agatha Christie: First novel rejected for 5 years</li>
      </ul>

      <p style={emailStyles.paragraph}>
        Every &quot;no&quot; brings you closer to the right &quot;yes.&quot; Keep believing in your work and your
        ability to tell meaningful stories.
      </p>

      <p style={emailStyles.paragraph}>
        You&apos;ve got this!
        <br />
        The OttoWrite Team
      </p>
    </BaseEmail>
  )
}

export function submissionRejectedEmailText({
  userName,
  partnerName,
  manuscriptTitle,
  rejectedAt,
  submissionUrl,
  feedback,
}: SubmissionRejectedEmailProps): string {
  return `
Hi ${userName},

We wanted to let you know that ${partnerName} has decided not to move forward with &quot;${manuscriptTitle}&quot; at this time.

Decision Date: ${rejectedAt}

${feedback ? `Feedback from ${partnerName}:\n&quot;${feedback}&quot;\n\n` : ''}

REMEMBER: Rejection is a normal part of the publishing process. Many bestselling authors received numerous rejections before finding the right partner.

Keep Moving Forward:
- This is one partner&apos;s opinion, not a judgment of your work&apos;s value
- Consider any feedback provided and use it to strengthen your manuscript
- Keep submitting to other partners who might be a better fit
- Continue writing and refining your craft

View submission details: ${submissionUrl}
Submit to another partner: {{app_url}}/submissions/new

Success Stories:
- J.K. Rowling: Harry Potter was rejected 12 times
- Stephen King: Carrie was rejected 30 times
- Agatha Christie: First novel rejected for 5 years

Every &quot;no&quot; brings you closer to the right &quot;yes.&quot; Keep believing in your work and your ability to tell meaningful stories.

You&apos;ve got this!
The OttoWrite Team

---
© ${new Date().getFullYear()} OttoWrite. All rights reserved.
  `.trim()
}
