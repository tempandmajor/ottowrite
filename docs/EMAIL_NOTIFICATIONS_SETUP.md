# Email Notifications Setup & Configuration

**Ticket:** PROD-007
**Status:** ✅ COMPLETED
**Created:** 2025-01-23

This guide covers the complete setup and configuration of the email notification system for OttoWrite using Resend.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Setup Guide](#setup-guide)
4. [Email Templates](#email-templates)
5. [Testing](#testing)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## Overview

OttoWrite uses **Resend** as the email service provider for sending transactional email notifications to users. The system supports:

- 6 notification types for manuscript submissions
- User-configurable notification preferences
- Immediate and digest (daily/weekly) delivery modes
- React-based email templates
- HTML and plain text versions
- Unsubscribe management

**Technology Stack:**
- **Email Service:** Resend
- **Templates:** React components (rendered to HTML)
- **Integration:** Built into existing notification system

---

## Features

### Supported Notification Types

| Type | Trigger | Description |
|------|---------|-------------|
| `partner_viewed` | Partner opens submission | Notifies author when partner views their manuscript |
| `material_requested` | Partner requests materials | Sent when partner requests sample chapters or full manuscript |
| `response_received` | Partner sends message | General response or feedback from partner |
| `status_accepted` | Offer of representation | Congratulations email when partner accepts submission |
| `status_rejected` | Submission declined | Encouraging email when partner declines submission |
| `submission_reminder` | Periodic check-in | Reminder about pending submissions (not yet implemented) |

### User Preferences

Users can control:
- **Channels:** In-app only, Email only, or Both
- **Email Frequency:** Immediate, Daily digest, Weekly digest, Never
- **Per-Event Toggles:** Enable/disable specific notification types

---

## Setup Guide

### 1. Create Resend Account

1. Go to [https://resend.com/signup](https://resend.com/signup)
2. Create a new account
3. Verify your email address

**Pricing:**
- **Free Tier:** 100 emails/day, 3,000 emails/month
- **Pro Tier:** $20/month for 50,000 emails
- See [https://resend.com/pricing](https://resend.com/pricing) for details

### 2. Get API Key

1. Log in to [Resend Dashboard](https://resend.com/api-keys)
2. Click **"Create API Key"**
3. Name it (e.g., "OttoWrite Production")
4. Click **"Create"**
5. Copy the API key (starts with `re_`)

⚠️ **Important:** Save this key securely! You won't be able to see it again.

### 3. Verify Your Domain (Production Only)

For production use, you must verify your domain to send emails from it.

**Steps:**

1. Go to [Resend Domains](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter your domain (e.g., `ottowrite.com`)
4. Add the DNS records provided by Resend:

```dns
Type    Name                         Value
TXT     @                            [Resend verification code]
TXT     resend._domainkey           [DKIM public key]
MX      @                            feedback-smtp.us-east-1.amazonses.com (priority 10)
TXT     _dmarc                       v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

5. Wait 5-30 minutes for DNS propagation
6. Click **"Verify Domain"** in Resend dashboard

### 4. Configure Environment Variables

**Development (.env.local):**

```bash
# Resend API Key (required)
RESEND_API_KEY=re_[your_development_api_key]

# From email address (optional - defaults to OttoWrite <noreply@ottowrite.app>)
RESEND_FROM_EMAIL=OttoWrite <noreply@yourdomain.com>

# App URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production (Vercel Environment Variables):**

1. Go to: Vercel Dashboard → Project → Settings → Environment Variables
2. Add each variable:
   - Key: `RESEND_API_KEY`
   - Value: `re_[your_production_key]`
   - Environment: **Production only**
3. Add:
   - Key: `RESEND_FROM_EMAIL`
   - Value: `OttoWrite <noreply@your-verified-domain.com>`
   - Environment: **Production only**
4. Trigger a new deployment

### 5. Test Configuration

Run the test script to verify everything is working:

```bash
# Send test email to your address
npm run test:email your-email@example.com

# Test specific notification type
npm run test:email your-email@example.com --type=partner_viewed

# Test all notification types
npm run test:email your-email@example.com --all
```

**Expected Output:**
```
📧 OttoWrite Email Notification Testing
============================================================
✅ Email configuration found
ℹ️  RESEND_API_KEY: re_123456789...
ℹ️  RESEND_FROM_EMAIL: OttoWrite <noreply@ottowrite.app>

📨 Sending Basic Test Email...
============================================================
✅ Test email sent to your-email@example.com
ℹ️  Email ID: abc123-def456-ghi789

📊 Test Summary
============================================================
Total tests: 1
Passed: 1
Failed: 0

✅ All tests passed! 🎉
```

---

## Email Templates

All email templates are React components located in `lib/email/templates/`.

### Template Structure

```
lib/email/templates/
├── base-email.tsx              # Base layout with header/footer
├── partner-viewed.tsx          # Partner viewed notification
├── material-requested.tsx      # Material request notification
├── response-received.tsx       # Response notification
├── submission-accepted.tsx     # Acceptance notification
├── submission-rejected.tsx     # Rejection notification
├── submission-reminder.tsx     # Reminder notification
└── index.ts                    # Template exports
```

### Base Template Features

All emails include:
- Consistent OttoWrite branding
- Responsive design for mobile/desktop
- Plain text fallback
- Unsubscribe link
- Preference management link

### Customizing Templates

To modify a template:

1. Open the template file (e.g., `lib/email/templates/partner-viewed.tsx`)
2. Edit the React component
3. Update both the HTML component and plain text function
4. Test with `npm run test:email`

**Example:**

```tsx
// lib/email/templates/partner-viewed.tsx

export function PartnerViewedEmail({
  userName,
  partnerName,
  manuscriptTitle,
  viewedAt,
  submissionUrl,
}: PartnerViewedEmailProps) {
  return (
    <BaseEmail previewText={`${partnerName} viewed "${manuscriptTitle}"`}>
      <h2 style={emailStyles.heading}>Your submission has been viewed! 👀</h2>

      <p style={emailStyles.paragraph}>Hi {userName},</p>

      <p style={emailStyles.paragraph}>
        Great news! <strong>{partnerName}</strong> has opened and viewed your manuscript...
      </p>

      {/* Your custom content here */}
    </BaseEmail>
  )
}
```

---

## Testing

### Manual Testing

**Test Basic Configuration:**
```bash
npm run test:email your-email@example.com
```

**Test Specific Notification Type:**
```bash
npm run test:email your-email@example.com --type=partner_viewed
npm run test:email your-email@example.com --type=material_requested
npm run test:email your-email@example.com --type=status_accepted
```

**Test All Notification Types:**
```bash
npm run test:email your-email@example.com --all
```

### Integration Testing

Test with actual user data:

```typescript
import { notifyPartnerViewed } from '@/lib/notifications/create-notification'

// In your API route or server action
await notifyPartnerViewed(
  userId,
  submissionId,
  'My Great Novel',
  'Literary Partners Agency',
  {
    userName: 'John Doe',
    userEmail: 'john@example.com',
    viewedAt: new Date().toLocaleString('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
    }),
  }
)
```

### Email Client Testing

Test email rendering in different clients:

| Client | Testing Method |
|--------|----------------|
| Gmail | Forward test email to Gmail account |
| Outlook | Forward to Outlook.com or desktop app |
| Apple Mail | Forward to iCloud email |
| Mobile | Check on iOS Mail and Android Gmail |

**Checklist:**
- [ ] Images load correctly
- [ ] Links work
- [ ] Text is readable (not too small)
- [ ] Layout doesn't break
- [ ] Unsubscribe link works

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] **Resend account created**
- [ ] **Production API key generated**
- [ ] **Domain verified in Resend**
- [ ] **DNS records configured (SPF, DKIM, DMARC)**
- [ ] **Environment variables added to Vercel**
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - `NEXT_PUBLIC_APP_URL`
- [ ] **Test email sent successfully**
- [ ] **Unsubscribe flow tested**
- [ ] **All 6 notification types tested**

### DNS Records Verification

Check your DNS records are correctly configured:

```bash
# Verify DKIM
dig TXT resend._domainkey.yourdomain.com

# Verify DMARC
dig TXT _dmarc.yourdomain.com

# Verify MX records
dig MX yourdomain.com
```

### Monitoring

**Resend Dashboard:**
- View email delivery logs: [https://resend.com/emails](https://resend.com/emails)
- Check bounce rates
- Monitor API usage
- Review failed deliveries

**Key Metrics to Monitor:**
- **Delivery Rate:** Should be > 95%
- **Bounce Rate:** Should be < 5%
- **Spam Complaints:** Should be < 0.1%
- **API Usage:** Track against plan limits

---

## Troubleshooting

### Email Not Configured Error

**Error:**
```
[Email] Skipping email send - Resend not configured
```

**Solution:**
1. Check `RESEND_API_KEY` is set in environment variables
2. Verify the key starts with `re_`
3. Restart your development server

### Invalid API Key

**Error:**
```
Failed to send email: Authentication failed
```

**Solution:**
1. Verify your API key is correct
2. Make sure you're using the right key for the environment (dev vs production)
3. Check the key hasn't been deleted in Resend dashboard
4. Regenerate the API key if needed

### Domain Not Verified

**Error:**
```
Failed to send email: Domain not verified
```

**Solution:**
1. Go to [Resend Domains](https://resend.com/domains)
2. Check domain verification status
3. Verify all DNS records are correctly added
4. Wait for DNS propagation (up to 48 hours)
5. Click "Verify Domain" again

### Emails Going to Spam

**Causes:**
- Domain not verified
- Missing SPF/DKIM/DMARC records
- High bounce rate
- User reports as spam

**Solution:**
1. Verify domain in Resend
2. Add all required DNS records
3. Test with [Mail Tester](https://www.mail-tester.com/)
4. Ensure unsubscribe link is prominent
5. Don't send too many emails too quickly

### Rate Limiting

**Error:**
```
Failed to send email: Rate limit exceeded
```

**Solution:**
1. Check your Resend plan limits
2. Implement email queuing for high volume
3. Upgrade to a higher tier if needed
4. Use digest emails instead of immediate for less critical notifications

---

## API Reference

### Send Notification Email

```typescript
import { sendNotificationEmail } from '@/lib/email/send-notification-email'

const result = await sendNotificationEmail({
  type: 'partner_viewed',
  to: 'user@example.com',
  data: {
    userName: 'Jane Doe',
    userEmail: 'user@example.com',
    manuscriptTitle: 'The Great Novel',
    partnerName: 'Literary Partners',
    viewedAt: 'January 23, 2025',
  },
  unsubscribeUrl: 'https://ottowrite.app/settings/notifications',
})

if (result.success) {
  console.log('Email sent:', result.emailId)
} else {
  console.error('Email failed:', result.error)
}
```

### Check Email Configuration

```typescript
import { isEmailConfigured } from '@/lib/email/resend-client'

if (isEmailConfigured()) {
  // Email service is ready
} else {
  // Email service not configured
}
```

### Send Test Email

```typescript
import { sendTestEmail } from '@/lib/email/send-notification-email'

const result = await sendTestEmail('test@example.com')
```

### Notification Helper Functions

```typescript
import {
  notifyPartnerViewed,
  notifyMaterialRequested,
  notifyResponseReceived,
  notifySubmissionAccepted,
  notifySubmissionRejected,
  notifySubmissionReminder,
} from '@/lib/notifications/create-notification'

// Partner viewed submission
await notifyPartnerViewed(
  userId,
  submissionId,
  'Manuscript Title',
  'Partner Name',
  {
    userName: 'User Name',
    userEmail: 'user@example.com',
    viewedAt: 'January 23, 2025',
  }
)

// Material requested
await notifyMaterialRequested(
  userId,
  submissionId,
  'Manuscript Title',
  'Partner Name',
  'full', // or 'sample'
  {
    userName: 'User Name',
    userEmail: 'user@example.com',
    requestedAt: 'January 23, 2025',
    message: 'Optional message from partner',
  }
)

// And so on for other notification types...
```

---

## Files Reference

### Email Service Files

| File | Purpose |
|------|---------|
| `lib/email/resend-client.ts` | Resend client configuration |
| `lib/email/send-notification-email.ts` | Main email sending service |
| `lib/email/templates/base-email.tsx` | Base email template |
| `lib/email/templates/*.tsx` | Individual notification templates |
| `lib/notifications/create-notification.ts` | Integration with notification system |

### Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` | Development environment variables |
| `.env.production.example` | Production environment variables |
| `package.json` | NPM scripts including `test:email` |

### Testing & Scripts

| File | Purpose |
|------|---------|
| `scripts/test-email-notifications.ts` | Email testing script |

---

## Support & Resources

**Resend Documentation:**
- Main Docs: [https://resend.com/docs](https://resend.com/docs)
- API Reference: [https://resend.com/docs/api-reference](https://resend.com/docs/api-reference)
- React Email: [https://react.email](https://react.email)

**OttoWrite Resources:**
- Email Templates: `lib/email/templates/`
- Notification System: `lib/notifications/`
- Test Script: `scripts/test-email-notifications.ts`

**Need Help?**
- Check [Troubleshooting](#troubleshooting) section
- Review Resend dashboard logs
- Test with `npm run test:email`
- Contact Resend support: [https://resend.com/support](https://resend.com/support)

---

**Last Updated:** January 23, 2025
**Version:** 1.0.0
**Status:** ✅ Production Ready
