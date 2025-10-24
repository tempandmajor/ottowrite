/**
 * Material Requested Email Template
 *
 * Sent when a partner requests additional materials (sample chapters, full manuscript, etc.)
 */

import * as React from 'react'
import { BaseEmail, emailStyles } from './base-email'

interface MaterialRequestedEmailProps {
  userName: string
  partnerName: string
  manuscriptTitle: string
  materialType: string // 'sample' or 'full'
  requestedAt: string
  submissionUrl: string
  message?: string
}

export function MaterialRequestedEmail({
  userName,
  partnerName,
  manuscriptTitle,
  materialType,
  requestedAt,
  submissionUrl,
  message,
}: MaterialRequestedEmailProps) {
  const materialLabel = materialType === 'full' ? 'Full Manuscript' : 'Sample Chapters'

  return (
    <BaseEmail previewText={`${partnerName} requested ${materialLabel.toLowerCase()}`}>
      <h2 style={emailStyles.heading}>📚 Material Request Received!</h2>

      <p style={emailStyles.paragraph}>Hi {userName},</p>

      <p style={emailStyles.paragraph}>
        Excellent news! <strong>{partnerName}</strong> has requested your{' '}
        <strong>{materialLabel.toLowerCase()}</strong> for <strong>&quot;{manuscriptTitle}&quot;</strong>.
      </p>

      <div style={emailStyles.success}>
        <p style={emailStyles.successText}>
          <strong>Requested:</strong> {materialLabel}
          <br />
          <strong>Date:</strong> {requestedAt}
        </p>
      </div>

      {message && (
        <>
          <p style={{ ...emailStyles.label, marginTop: '24px' }}>Message from {partnerName}:</p>
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

      <p style={emailStyles.paragraph}>
        This is a significant step forward! The partner is interested enough to review more of your
        work. Make sure your materials are polished and ready.
      </p>

      <a href={submissionUrl} style={emailStyles.button}>
        View Submission & Upload Materials
      </a>

      <hr style={emailStyles.divider} />

      <p style={emailStyles.paragraph}>
        <strong>Next Steps:</strong>
      </p>

      <ul style={{ ...emailStyles.paragraph, paddingLeft: '20px' }}>
        <li>Review the partner&apos;s request and any specific instructions</li>
        <li>Ensure your materials are properly formatted</li>
        <li>Upload the requested materials through your submission dashboard</li>
        <li>Wait for the partner&apos;s response (typically 2-6 weeks)</li>
      </ul>

      <p style={emailStyles.paragraph}>
        <strong>Tip:</strong> Response times vary, but this request is a strong indicator of
        interest. Stay professional and patient throughout the process.
      </p>

      <p style={emailStyles.paragraph}>
        Best of luck!
        <br />
        The OttoWrite Team
      </p>
    </BaseEmail>
  )
}

export function materialRequestedEmailText({
  userName,
  partnerName,
  manuscriptTitle,
  materialType,
  requestedAt,
  submissionUrl,
  message,
}: MaterialRequestedEmailProps): string {
  const materialLabel = materialType === 'full' ? 'Full Manuscript' : 'Sample Chapters'

  return `
Hi ${userName},

Excellent news! ${partnerName} has requested your ${materialLabel.toLowerCase()} for &quot;${manuscriptTitle}&quot;.

Requested: ${materialLabel}
Date: ${requestedAt}

${message ? `Message from ${partnerName}:\n&quot;${message}&quot;\n\n` : ''}

This is a significant step forward! The partner is interested enough to review more of your work. Make sure your materials are polished and ready.

View submission & upload materials: ${submissionUrl}

Next Steps:
- Review the partner&apos;s request and any specific instructions
- Ensure your materials are properly formatted
- Upload the requested materials through your submission dashboard
- Wait for the partner&apos;s response (typically 2-6 weeks)

Tip: Response times vary, but this request is a strong indicator of interest. Stay professional and patient throughout the process.

Best of luck!
The OttoWrite Team

---
© ${new Date().getFullYear()} OttoWrite. All rights reserved.
  `.trim()
}
