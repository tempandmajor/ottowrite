/**
 * Legal Documents for Manuscript Submissions
 *
 * Provides legal text and agreement management for:
 * - Terms of Service
 * - Privacy Policy
 * - IP Protection Agreement
 * - Partner Terms
 */

export interface LegalDocument {
  id: string
  title: string
  version: string
  effectiveDate: string
  lastUpdated: string
  content: string
  type: 'terms' | 'privacy' | 'ip-protection' | 'partner-terms'
}

/**
 * Terms of Service for Manuscript Submissions
 */
export const SUBMISSION_TERMS_OF_SERVICE: LegalDocument = {
  id: 'submission-tos-v1',
  title: 'Manuscript Submission Terms of Service',
  version: '1.0',
  effectiveDate: '2025-01-22',
  lastUpdated: '2025-01-22',
  type: 'terms',
  content: `
# Manuscript Submission Terms of Service

**Effective Date:** January 22, 2025
**Last Updated:** January 22, 2025
**Version:** 1.0

## 1. Acceptance of Terms

By using Ottowrite's Manuscript Submission System ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service.

## 2. Service Description

The Manuscript Submission System allows authors to submit their manuscripts, query letters, and synopses to literary agents and publishers ("Partners") through our platform. The Service provides:

- Secure manuscript storage and transmission
- Watermarking and digital rights management (DRM)
- Access control and tracking
- Communication with Partners

## 3. User Responsibilities

### 3.1 Account Requirements

- You must have an active Ottowrite Studio subscription to access the Service
- You must provide accurate and complete information
- You are responsible for maintaining the confidentiality of your account
- You must notify us immediately of any unauthorized access

### 3.2 Content Requirements

You represent and warrant that:

- You own or have the necessary rights to all submitted content
- Your submissions do not infringe on any third-party intellectual property rights
- Your content does not violate any applicable laws or regulations
- Your submissions do not contain malicious code, viruses, or harmful content

### 3.3 Prohibited Uses

You may not:

- Submit content you do not have rights to
- Use the Service to harass, abuse, or harm others
- Attempt to bypass security measures or watermarking systems
- Share access tokens or credentials with unauthorized parties
- Use automated systems to submit manuscripts without authorization

## 4. Intellectual Property Rights

### 4.1 Your Content

You retain all intellectual property rights to your submitted manuscripts. By using the Service, you grant us a limited license to:

- Store and transmit your manuscripts to selected Partners
- Apply watermarking and security measures
- Display excerpts for submission tracking purposes
- Create backups and ensure service reliability

### 4.2 Our Platform

The Service, including all software, design, and functionality, is owned by Ottowrite and protected by copyright, trademark, and other intellectual property laws.

## 5. Partner Submissions

### 5.1 Submission Process

When you submit a manuscript to Partners:

- Each Partner receives a unique, watermarked version
- Access is time-limited (default 90 days, configurable)
- All access is logged and tracked
- You can revoke access at any time

### 5.2 Partner Relationships

- We facilitate introductions but do not guarantee acceptance
- Direct relationships between you and Partners are governed by their terms
- We are not party to any agreements you make with Partners
- Partners must comply with our Partner Terms of Service

### 5.3 Response Expectations

- Partners are not obligated to respond to submissions
- Response times vary by Partner
- We do not guarantee any particular outcome

## 6. Watermarking and DRM

### 6.1 Security Measures

To protect your intellectual property, we:

- Apply unique watermarks to each Partner copy
- Enforce view-only restrictions
- Track all document access
- Maintain audit logs

### 6.2 Leak Detection

If you discover unauthorized distribution of your manuscript:

- Contact us immediately
- Provide the leaked content for watermark analysis
- We will assist in identifying the source
- Legal action is your responsibility

## 7. Privacy and Data Protection

### 7.1 Data Collection

We collect and process:

- Manuscript content and metadata
- Submission history and tracking data
- Partner interaction records
- Access logs and security events

### 7.2 Data Use

Your data is used to:

- Provide and improve the Service
- Facilitate Partner communications
- Ensure security and prevent abuse
- Comply with legal obligations

For complete details, see our Privacy Policy.

## 8. Payment and Subscription

### 8.1 Studio Subscription Required

- The Service requires an active Studio subscription
- Pricing is subject to change with notice
- Submissions are limited by your subscription tier
- No refunds for unused submissions

### 8.2 Transaction Fees

We do not charge transaction fees on deals you make with Partners. Any financial arrangements are between you and the Partner.

## 9. Service Availability

### 9.1 Uptime

We strive for high availability but do not guarantee uninterrupted service. We are not liable for:

- Scheduled maintenance downtime
- Technical difficulties or outages
- Third-party service disruptions
- Force majeure events

### 9.2 Data Backup

While we maintain backups, you are responsible for keeping copies of your manuscripts. We are not liable for data loss.

## 10. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW:

- THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES
- WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES
- OUR TOTAL LIABILITY IS LIMITED TO THE AMOUNT YOU PAID IN THE LAST 12 MONTHS
- WE ARE NOT RESPONSIBLE FOR PARTNER ACTIONS OR DECISIONS

## 11. Indemnification

You agree to indemnify and hold harmless Ottowrite from any claims arising from:

- Your use of the Service
- Your submitted content
- Your violation of these Terms
- Your violation of third-party rights

## 12. Termination

### 12.1 By You

You may stop using the Service at any time. Deleting your account will:

- Remove your manuscripts from active submission
- Revoke Partner access tokens
- Retain logs for legal compliance (90 days minimum)

### 12.2 By Us

We may suspend or terminate your access if you:

- Violate these Terms
- Engage in fraudulent or abusive behavior
- Fail to maintain an active subscription

## 13. Changes to Terms

We may modify these Terms at any time. We will:

- Notify you of material changes
- Provide 30 days' notice when possible
- Post the updated Terms on our website

Continued use after changes constitutes acceptance.

## 14. Governing Law

These Terms are governed by the laws of [Jurisdiction], without regard to conflict of law principles. Any disputes will be resolved in the courts of [Jurisdiction].

## 15. Dispute Resolution

### 15.1 Informal Resolution

Before filing a claim, you agree to contact us to seek informal resolution.

### 15.2 Arbitration

Any disputes will be resolved through binding arbitration, except for:

- Intellectual property claims
- Small claims court matters
- Injunctive relief requests

## 16. Miscellaneous

### 16.1 Entire Agreement

These Terms constitute the entire agreement between you and Ottowrite regarding the Service.

### 16.2 Severability

If any provision is found unenforceable, the remaining provisions remain in effect.

### 16.3 No Waiver

Our failure to enforce any provision does not waive our right to do so later.

### 16.4 Assignment

You may not assign these Terms. We may assign our rights and obligations.

## 17. Contact Information

For questions about these Terms:

**Email:** legal@ottowrite.com
**Address:** [Company Address]
**Support:** https://ottowrite.com/support

---

**By clicking "I Agree" or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.**
`.trim(),
}

/**
 * Privacy Policy for Manuscript Submissions
 */
export const SUBMISSION_PRIVACY_POLICY: LegalDocument = {
  id: 'submission-privacy-v1',
  title: 'Manuscript Submission Privacy Policy',
  version: '1.0',
  effectiveDate: '2025-01-22',
  lastUpdated: '2025-01-22',
  type: 'privacy',
  content: `
# Manuscript Submission Privacy Policy

**Effective Date:** January 22, 2025
**Last Updated:** January 22, 2025
**Version:** 1.0

## 1. Introduction

This Privacy Policy describes how Ottowrite ("we," "us," or "our") collects, uses, and protects your personal information when you use our Manuscript Submission System.

## 2. Information We Collect

### 2.1 Manuscript Content

- Full text of manuscripts, query letters, and synopses
- Titles, genres, word counts, and other metadata
- Submission notes and internal comments

### 2.2 Account Information

- Name, email address, and profile information
- Subscription tier and payment information
- Account settings and preferences

### 2.3 Submission Data

- Partner selections and submission history
- Timestamps of all submissions and interactions
- Response data from Partners

### 2.4 Technical Data

- Access logs and IP addresses
- Device information and fingerprints
- Session data and authentication tokens
- Usage analytics and performance metrics

### 2.5 Communication Data

- Messages with Partners through our platform
- Support inquiries and responses
- Email notifications and preferences

## 3. How We Use Your Information

### 3.1 Service Provision

- Store and transmit your manuscripts to selected Partners
- Apply watermarking and security measures
- Track submission status and access
- Facilitate communication with Partners

### 3.2 Service Improvement

- Analyze usage patterns to improve features
- Identify and fix technical issues
- Develop new functionality
- Optimize performance and user experience

### 3.3 Security and Fraud Prevention

- Detect and prevent unauthorized access
- Investigate suspicious activity
- Enforce our Terms of Service
- Comply with legal obligations

### 3.4 Communications

- Send submission confirmations and updates
- Notify you of Partner responses
- Provide customer support
- Send important service announcements

## 4. Information Sharing

### 4.1 With Partners

When you submit to a Partner, we share:

- Your watermarked manuscript
- Your name and contact information (if authorized)
- Submission metadata (title, genre, word count)

Partners must comply with our Partner Terms and maintain confidentiality.

### 4.2 Service Providers

We may share data with trusted service providers who assist with:

- Cloud storage and hosting
- Email delivery
- Analytics and monitoring
- Payment processing

### 4.3 Legal Requirements

We may disclose information when required to:

- Comply with legal obligations
- Respond to valid legal requests
- Protect our rights and property
- Prevent fraud or abuse

### 4.4 Business Transfers

If Ottowrite is acquired or merged, your information may be transferred to the new entity.

## 5. Data Security

### 5.1 Security Measures

We implement industry-standard security measures:

- Encryption in transit (TLS/SSL)
- Encryption at rest for sensitive data
- Access controls and authentication
- Regular security audits
- Watermarking and DRM systems

### 5.2 Your Responsibility

You are responsible for:

- Maintaining account credential security
- Not sharing access tokens
- Reporting security incidents promptly

## 6. Data Retention

### 6.1 Active Submissions

We retain your data while your submissions are active and for:

- 90 days after Partner access expires (default)
- Longer if required by law or ongoing disputes

### 6.2 Account Deletion

When you delete your account:

- Active submissions are removed
- Partner access is revoked
- Personal data is deleted within 30 days
- Logs retained for legal compliance (90 days minimum)
- Anonymized analytics data may be retained

## 7. Your Rights

### 7.1 Access and Portability

You have the right to:

- Access your personal information
- Export your manuscript data
- Obtain copies of submission records

### 7.2 Correction and Deletion

You can:

- Update your account information
- Correct inaccurate data
- Request deletion of your data

### 7.3 Control and Consent

You may:

- Revoke Partner access at any time
- Withdraw consent for data processing
- Opt out of non-essential communications

### 7.4 Complaints

You have the right to file a complaint with your local data protection authority.

## 8. International Data Transfers

Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place.

## 9. Children's Privacy

The Service is not intended for users under 18. We do not knowingly collect data from children.

## 10. Cookies and Tracking

We use cookies and similar technologies for:

- Authentication and session management
- Analytics and performance monitoring
- User preferences and settings

You can control cookies through your browser settings.

## 11. Third-Party Links

Our Service may contain links to third-party websites. We are not responsible for their privacy practices.

## 12. Changes to This Policy

We may update this Privacy Policy. We will:

- Notify you of material changes
- Post the updated policy on our website
- Provide notice through the Service or email

## 13. Contact Us

For privacy questions or to exercise your rights:

**Email:** privacy@ottowrite.com
**Data Protection Officer:** dpo@ottowrite.com
**Address:** [Company Address]

---

**By using the Service, you acknowledge that you have read and understood this Privacy Policy.**
`.trim(),
}

/**
 * IP Protection Agreement
 */
export const IP_PROTECTION_AGREEMENT: LegalDocument = {
  id: 'ip-protection-v1',
  title: 'Intellectual Property Protection Agreement',
  version: '1.0',
  effectiveDate: '2025-01-22',
  lastUpdated: '2025-01-22',
  type: 'ip-protection',
  content: `
# Intellectual Property Protection Agreement

**Effective Date:** January 22, 2025
**Version:** 1.0

## Purpose

This Agreement outlines the intellectual property protections applied to your manuscript submissions and your acknowledgment of these measures.

## 1. Your IP Rights

### 1.1 Ownership

You retain 100% ownership of all intellectual property rights in your manuscript, including:

- Copyright in the original work
- Derivative work rights
- Adaptation and translation rights
- All other rights not expressly granted

### 1.2 Limited License to Ottowrite

You grant Ottowrite a limited, non-exclusive license to:

- Store and secure your manuscript
- Apply watermarking and DRM protection
- Transmit watermarked copies to selected Partners
- Create backups for service continuity

This license terminates when you delete your submission or close your account.

## 2. Watermarking System

### 2.1 Protection Measures

To protect your intellectual property, we apply:

**Invisible Watermarks:** Each Partner copy contains unique, invisible identifiers including:
- Zero-width character sequences
- Homoglyph substitutions (visually identical characters)
- Whitespace pattern encoding
- Document fingerprints

**Purpose:** Enable identification of the source if your manuscript is leaked or distributed without authorization.

### 2.2 Watermark Properties

- Watermarks are designed to be invisible and not affect readability
- Each Partner receives a unique watermark ID
- Watermarks persist through most modifications (copy/paste, reformatting)
- Watermark data is stored securely and associated with each submission

### 2.3 Detection and Enforcement

If unauthorized distribution occurs:

- You may submit suspected leaked content to us
- We will analyze the watermark to identify the source
- We will provide you with watermark analysis results
- Legal enforcement is your responsibility

**Important:** While watermarking is a deterrent, it cannot prevent all unauthorized distribution. It is a detection tool, not a prevention tool.

## 3. Digital Rights Management (DRM)

### 3.1 Access Controls

Partner access to your manuscript includes:

- **Time-Limited Access:** Default 90 days, configurable
- **View-Only Mode:** Partners cannot download, print, or copy by default
- **Revocable Access:** You can revoke access at any time
- **Access Tracking:** All views are logged with timestamps and IP addresses

### 3.2 Security Headers

We enforce browser-level security through:

- Content Security Policy (CSP) headers
- Frame restrictions to prevent embedding
- Copy/print prevention directives
- Right-click protection (client-side)

**Limitation:** Determined users with technical knowledge may bypass client-side restrictions. DRM reduces casual copying but cannot prevent all unauthorized access.

## 4. Your Responsibilities

### 4.1 Original Work

You affirm that:

- You are the original author or have necessary rights
- Your manuscript does not infringe on third-party IP
- You have the right to grant the licenses described herein

### 4.2 Confidentiality

You agree to:

- Keep access tokens confidential
- Not share Partner access links publicly
- Report any suspected unauthorized access immediately
- Maintain copies of your original manuscripts

### 4.3 Partner Selection

You acknowledge that:

- You control which Partners receive your manuscript
- Each submission creates a new watermarked copy
- You should only submit to trusted Partners
- Partner selection is your responsibility

## 5. Limitations and Disclaimers

### 5.1 No Absolute Protection

You understand and acknowledge that:

- **No system can prevent all unauthorized distribution**
- Watermarking is a detection tool, not a prevention tool
- DRM can be bypassed by sophisticated users
- Screenshots and manual retyping cannot be prevented
- Partners may have legitimate reasons to download for review

### 5.2 No Legal Advice

This protection system does not constitute legal advice. For IP legal matters:

- Consult a qualified intellectual property attorney
- We provide technical protection, not legal protection
- Copyright registration is recommended before submission

### 5.3 Service Limitations

We do not guarantee:

- Prevention of all IP theft
- Detection of all leaks
- Recovery of damages from infringement
- Legal support for IP disputes

## 6. Leak Response Protocol

If you discover unauthorized distribution:

### 6.1 Immediate Actions

1. **Document Evidence:** Save copies of the leaked content and source
2. **Contact Us:** Email security@ottowrite.com with details
3. **Preserve Logs:** Do not delete your submission until investigation is complete

### 6.2 Our Response

We will:

1. Analyze the watermark to identify the Partner source
2. Provide you with watermark analysis results within 5 business days
3. Suspend the Partner's access if policy violation is confirmed
4. Preserve access logs for potential legal proceedings

### 6.3 Your Legal Options

You may pursue:

- DMCA takedown notices
- Legal action against the infringing party
- Damages under copyright law
- Breach of contract claims against Partners

We will cooperate with valid legal requests but are not a party to your legal actions.

## 7. Partner Obligations

Partners who receive your manuscript must:

- Maintain confidentiality
- Use content only for submission review purposes
- Not distribute without your written permission
- Comply with our Partner Terms of Service

Partner violations should be reported to us immediately.

## 8. Indemnification

### 8.1 By You

You agree to indemnify Ottowrite from claims arising from:

- Your submission of infringing content
- Your breach of this Agreement
- Your misrepresentation of IP ownership

### 8.2 By Ottowrite

We agree to indemnify you from claims arising from:

- Our unauthorized use of your manuscript beyond the limited license
- Our failure to implement described security measures
- Our negligent disclosure of your content

## 9. Term and Termination

### 9.1 Duration

This Agreement remains in effect while your submissions are active.

### 9.2 Termination

You may terminate by:

- Deleting individual submissions
- Closing your account
- Revoking all Partner access

Upon termination:
- Partner access tokens are revoked
- Our license to use your content terminates
- Logs are retained per our Privacy Policy
- Watermark records are retained for ongoing protection

## 10. Modifications

We may update this Agreement to:

- Improve protection technologies
- Comply with legal requirements
- Clarify existing terms

Material changes require your consent before applying to existing submissions.

## 11. Acknowledgment and Consent

By clicking "I Agree" or submitting your manuscript, you acknowledge that:

✓ You have read and understood this Agreement
✓ You understand the limitations of technical IP protection
✓ You consent to the watermarking of your manuscripts
✓ You accept responsibility for Partner selection
✓ You understand this is not legal advice
✓ You retain all IP rights to your work

## Contact Information

For IP protection questions:

**Security Team:** security@ottowrite.com
**Legal Team:** legal@ottowrite.com
**Support:** https://ottowrite.com/support

---

**This Agreement works in conjunction with our Terms of Service and Privacy Policy to protect your intellectual property rights.**
`.trim(),
}

/**
 * Partner Terms of Service
 */
export const PARTNER_TERMS_OF_SERVICE: LegalDocument = {
  id: 'partner-tos-v1',
  title: 'Partner Terms of Service',
  version: '1.0',
  effectiveDate: '2025-01-22',
  lastUpdated: '2025-01-22',
  type: 'partner-terms',
  content: `
# Partner Terms of Service

**Effective Date:** January 22, 2025
**Version:** 1.0

## 1. Introduction

These Terms govern the use of Ottowrite's Manuscript Submission System by literary agents, publishers, and other industry professionals ("Partners").

## 2. Partner Eligibility

### 2.1 Requirements

Partners must:

- Be legitimate literary agents, publishers, or industry professionals
- Have verifiable industry credentials
- Maintain professional business practices
- Comply with applicable laws and regulations

### 2.2 Verification

We may verify your credentials through:

- Industry association membership (AAR, Publishers Association, etc.)
- Professional website and contact information
- References from industry colleagues
- Track record of sales or published works

### 2.3 Rejection Rights

We reserve the right to reject or remove Partners who:

- Provide false or misleading information
- Engage in fraudulent practices
- Violate these Terms
- Receive multiple author complaints

## 3. Access to Submissions

### 3.1 Receiving Submissions

When authors submit to you:

- You receive a watermarked copy of the manuscript
- Access is time-limited (typically 90 days)
- Each manuscript has a unique access token
- All access is logged and tracked

### 3.2 Access Restrictions

You may only:

- View manuscripts for submission review
- Save notes for internal evaluation purposes
- Share with authorized colleagues within your organization
- Use content for the purpose of submission consideration

### 3.3 Prohibited Uses

You may NOT:

- Distribute manuscripts outside your organization
- Share access tokens with unauthorized parties
- Remove or attempt to circumvent watermarks
- Use content for purposes other than submission review
- Claim ownership or rights to submitted content

## 4. Confidentiality Obligations

### 4.1 Non-Disclosure

You agree to:

- Maintain strict confidentiality of all submissions
- Not disclose manuscript content to third parties without author permission
- Implement reasonable security measures
- Limit access to authorized personnel only

### 4.2 Breach Consequences

Confidentiality breaches may result in:

- Immediate access revocation
- Account suspension or termination
- Legal liability for damages
- Watermark-based leak attribution
- Notification to industry associations

## 5. Intellectual Property Rights

### 5.1 Author Ownership

You acknowledge that:

- Authors retain 100% ownership of submitted manuscripts
- You receive no rights except evaluation permission
- You may not use, reproduce, or distribute content without authorization
- Copyright remains with the author

### 5.2 Watermarking

You understand that:

- Each manuscript contains unique, invisible watermarks
- Watermarks enable source identification if content is leaked
- Attempting to remove watermarks violates these Terms
- Watermark detection may be used in legal proceedings

## 6. Response Obligations

### 6.1 Professional Conduct

You should:

- Respond to submissions in a timely manner (recommended: 90 days)
- Provide professional, courteous responses
- Clearly communicate your interest level
- Honor your stated response times

### 6.2 No Guaranteed Response

While we encourage responses:

- You are not legally obligated to respond to every submission
- Response times vary based on volume and interest
- "No response" policies should be clearly stated in your profile

## 7. Representation and Acquisition

### 7.1 Direct Relationships

If you wish to represent or publish an author:

- Negotiate terms directly with the author
- Execute separate representation or publishing agreements
- Ottowrite is not a party to these agreements
- Standard industry practices apply

### 7.2 No Fees to Ottowrite

- We do not charge transaction fees on deals
- We do not receive royalties or commissions
- Financial arrangements are solely between you and the author

## 8. Data and Privacy

### 8.1 Data Collection

We collect:

- Your profile and contact information
- Submission responses and activity
- Access logs and timestamps
- Communication with authors through our platform

### 8.2 Data Use

We use Partner data to:

- Facilitate manuscript submissions
- Track submission status
- Improve our Service
- Ensure compliance with these Terms
- Provide author reporting and analytics

### 8.3 Data Sharing

We may share your information with:

- Authors who submit to you
- Other Partners (only public profile information)
- Law enforcement if legally required
- Service providers under confidentiality agreements

## 9. Partner Profile

### 9.1 Profile Requirements

Your profile must include:

- Accurate business information
- Genres and categories you accept
- Current submission status (open/closed)
- Response time expectations
- Any special submission requirements

### 9.2 Profile Updates

You must:

- Keep information current and accurate
- Update submission status promptly
- Notify us of business changes
- Maintain professional representation

## 10. Prohibited Conduct

Partners may not:

- Request reading fees or advance payments from authors
- Make false or misleading claims
- Engage in plagiarism or IP theft
- Harass, abuse, or discriminate against authors
- Use the platform for spam or solicitation
- Misrepresent credentials or track record
- Violate any applicable laws

## 11. Account Suspension and Termination

### 11.1 By You

You may close your account at any time. Upon closure:

- Active submission access expires immediately
- Your profile is removed
- Communication history is retained per our Privacy Policy

### 11.2 By Us

We may suspend or terminate your account for:

- Violation of these Terms
- Fraudulent or unethical behavior
- Author complaints
- Confidentiality breaches
- Inactivity (12+ months)

### 11.3 Appeal Process

If suspended, you may:

- Request explanation within 30 days
- Provide evidence of compliance
- Appeal the decision

## 12. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW:

- THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES
- WE ARE NOT LIABLE FOR THE QUALITY OR ACCURACY OF SUBMISSIONS
- WE ARE NOT RESPONSIBLE FOR AUTHOR DISPUTES
- OUR LIABILITY IS LIMITED TO THE FEES PAID (IF ANY)
- WE ARE NOT LIABLE FOR LOST OPPORTUNITIES OR BUSINESS

## 13. Indemnification

You agree to indemnify Ottowrite from claims arising from:

- Your use of the Service
- Your breach of these Terms
- Your violation of author rights
- Your unauthorized distribution of manuscripts
- Your professional conduct and business practices

## 14. Changes to Terms

We may modify these Terms. Material changes will be communicated with 30 days' notice. Continued use constitutes acceptance.

## 15. Governing Law

These Terms are governed by [Jurisdiction] law. Disputes will be resolved through arbitration, except for:

- IP claims
- Injunctive relief
- Small claims court matters

## 16. Contact Information

For Partner support:

**Email:** partners@ottowrite.com
**Legal:** legal@ottowrite.com
**Security Incidents:** security@ottowrite.com
**Support:** https://ottowrite.com/partners/support

---

**By creating a Partner account or accessing submissions, you agree to these Partner Terms of Service.**
`.trim(),
}

/**
 * Get all legal documents
 */
export function getAllLegalDocuments(): LegalDocument[] {
  return [
    SUBMISSION_TERMS_OF_SERVICE,
    SUBMISSION_PRIVACY_POLICY,
    IP_PROTECTION_AGREEMENT,
    PARTNER_TERMS_OF_SERVICE,
  ]
}

/**
 * Get legal document by ID
 */
export function getLegalDocumentById(id: string): LegalDocument | undefined {
  return getAllLegalDocuments().find((doc) => doc.id === id)
}

/**
 * Get legal document by type
 */
export function getLegalDocumentByType(
  type: LegalDocument['type']
): LegalDocument | undefined {
  return getAllLegalDocuments().find((doc) => doc.type === type)
}

/**
 * Get required agreements for submission
 */
export function getRequiredSubmissionAgreements(): LegalDocument[] {
  return [SUBMISSION_TERMS_OF_SERVICE, IP_PROTECTION_AGREEMENT]
}

/**
 * Check if user has agreed to required documents
 */
export interface UserAgreement {
  documentId: string
  version: string
  agreedAt: string
  ipAddress?: string
  userAgent?: string
}

export function hasRequiredAgreements(userAgreements: UserAgreement[]): boolean {
  const required = getRequiredSubmissionAgreements()
  return required.every((doc) =>
    userAgreements.some(
      (agreement) =>
        agreement.documentId === doc.id && agreement.version === doc.version
    )
  )
}

/**
 * Get missing agreements for user
 */
export function getMissingAgreements(
  userAgreements: UserAgreement[]
): LegalDocument[] {
  const required = getRequiredSubmissionAgreements()
  return required.filter(
    (doc) =>
      !userAgreements.some(
        (agreement) =>
          agreement.documentId === doc.id && agreement.version === doc.version
      )
  )
}
