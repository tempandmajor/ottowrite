/**
 * Submission Accepted Email Template
 *
 * Sent when a partner accepts the submission and offers representation or publication.
 */

import * as React from 'react'
import { BaseEmail, emailStyles } from './base-email'

interface SubmissionAcceptedEmailProps {
  userName: string
  partnerName: string
  manuscriptTitle: string
  acceptedAt: string
  submissionUrl: string
  message?: string
}

export function SubmissionAcceptedEmail({
  userName,
  partnerName,
  manuscriptTitle,
  acceptedAt,
  submissionUrl,
  message,
}: SubmissionAcceptedEmailProps) {
  return (
    <BaseEmail previewText={`🎉 ${partnerName} accepted your submission!`}>
      <h2 style={emailStyles.heading}>🎉 Congratulations! Submission Accepted!</h2>

      <p style={emailStyles.paragraph}>Hi {userName},</p>

      <div
        style={{
          backgroundColor: '#f0fff4',
          border: '2px solid #68d391',
          borderRadius: '8px',
          padding: '24px',
          margin: '24px 0',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: '#2f855a',
            fontSize: '20px',
            fontWeight: 600,
            margin: '0 0 8px',
          }}
        >
          🌟 Your manuscript has been accepted! 🌟
        </p>
        <p style={{ ...emailStyles.paragraph, color: '#2f855a', margin: 0 }}>
          <strong>{partnerName}</strong> is offering representation for{' '}
          <strong>&quot;{manuscriptTitle}&quot;</strong>
        </p>
      </div>

      <p style={emailStyles.paragraph}>
        This is an incredible milestone in your writing journey! The partner sees the potential in
        your work and wants to help bring it to the world.
      </p>

      <div style={emailStyles.success}>
        <p style={emailStyles.successText}>
          <strong>Accepted:</strong> {acceptedAt}
        </p>
      </div>

      {message && (
        <>
          <p style={{ ...emailStyles.label, marginTop: '24px' }}>
            Message from {partnerName}:
          </p>
          <div
            style={{
              backgroundColor: '#f6f9fc',
              border: '1px solid #d9e2ec',
              borderRadius: '6px',
              padding: '16px',
              margin: '8px 0 24px',
            }}
          >
            <p style={{ ...emailStyles.paragraph, margin: 0 }}>{message}</p>
          </div>
        </>
      )}

      <a href={submissionUrl} style={emailStyles.button}>
        View Acceptance Details
      </a>

      <hr style={emailStyles.divider} />

      <p style={emailStyles.paragraph}>
        <strong>Important Next Steps:</strong>
      </p>

      <ul style={{ ...emailStyles.paragraph, paddingLeft: '20px' }}>
        <li>Review the offer carefully and any attached contracts</li>
        <li>Consider having a literary attorney review the agreement</li>
        <li>Respond to the partner within their requested timeframe</li>
        <li>Ask questions about anything you don&apos;t understand</li>
        <li>Negotiate terms if needed - this is normal and expected</li>
      </ul>

      <div style={emailStyles.alert}>
        <p style={emailStyles.alertText}>
          <strong>⚠️ Important:</strong> Take your time to review the offer thoroughly. It&apos;s okay
          to ask questions and negotiate terms. Consider consulting with a literary attorney before
          signing any contracts.
        </p>
      </div>

      <p style={emailStyles.paragraph}>
        Congratulations again on this achievement! This is just the beginning of an exciting
        journey.
      </p>

      <p style={emailStyles.paragraph}>
        Warmest congratulations,
        <br />
        The OttoWrite Team
      </p>
    </BaseEmail>
  )
}

export function submissionAcceptedEmailText({
  userName,
  partnerName,
  manuscriptTitle,
  acceptedAt,
  submissionUrl,
  message,
}: SubmissionAcceptedEmailProps): string {
  return `
Hi ${userName},

🎉 CONGRATULATIONS! YOUR MANUSCRIPT HAS BEEN ACCEPTED! 🎉

${partnerName} is offering representation for &quot;${manuscriptTitle}"

This is an incredible milestone in your writing journey! The partner sees the potential in your work and wants to help bring it to the world.

Accepted: ${acceptedAt}

${message ? `Message from ${partnerName}:\n&quot;${message}&quot;\n\n` : ''}

View acceptance details: ${submissionUrl}

IMPORTANT NEXT STEPS:
- Review the offer carefully and any attached contracts
- Consider having a literary attorney review the agreement
- Respond to the partner within their requested timeframe
- Ask questions about anything you don&apos;t understand
- Negotiate terms if needed - this is normal and expected

⚠️ IMPORTANT: Take your time to review the offer thoroughly. It&apos;s okay to ask questions and negotiate terms. Consider consulting with a literary attorney before signing any contracts.

Congratulations again on this achievement! This is just the beginning of an exciting journey.

Warmest congratulations,
The OttoWrite Team

---
© ${new Date().getFullYear()} OttoWrite. All rights reserved.
  `.trim()
}
