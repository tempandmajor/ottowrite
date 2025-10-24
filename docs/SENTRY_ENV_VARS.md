# Sentry Environment Variables for Vercel

**IMPORTANT:** Your Vercel account has reached fair use limits. Environment variables must be added manually through the Vercel dashboard.

---

## Step-by-Step Instructions

### 1. Go to Vercel Dashboard

Navigate to: https://vercel.com/emmanuels-projects-15fbaf71/ottowrite/settings/environment-variables

### 2. Add Each Variable

Click "Add New" for each variable below. For each one:
- Enter the **Key** (variable name)
- Enter the **Value** (from below)
- Select **Environment:** Production only
- Click **Save**

---

## Environment Variables to Add

### Variable 1: NEXT_PUBLIC_SENTRY_DSN

**Key:**
```
NEXT_PUBLIC_SENTRY_DSN
```

**Value:**
```
https://33b2075881d65416bd161cf23b7ffb7b@o4510241757724672.ingest.us.sentry.io/4510241759232000
```

**Environment:** Production
**Type:** Plain Text (not encrypted)

---

### Variable 2: SENTRY_ORG

**Key:**
```
SENTRY_ORG
```

**Value:**
```
ottowrite
```

**Environment:** Production
**Type:** Plain Text

---

### Variable 3: SENTRY_PROJECT

**Key:**
```
SENTRY_PROJECT
```

**Value:**
```
javascript-nextjs
```

**Environment:** Production
**Type:** Plain Text

---

### Variable 4: SENTRY_AUTH_TOKEN

**Key:**
```
SENTRY_AUTH_TOKEN
```

**Value:**
```
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
```

**Environment:** Production
**Type:** Encrypted (select "Encrypted" option in Vercel)

---

### Variable 5: NEXT_PUBLIC_SENTRY_ENVIRONMENT

**Key:**
```
NEXT_PUBLIC_SENTRY_ENVIRONMENT
```

**Value:**
```
production
```

**Environment:** Production
**Type:** Plain Text

---

## 3. Trigger a New Deployment

After adding all 5 variables:

1. Go to: https://vercel.com/emmanuels-projects-15fbaf71/ottowrite
2. Click **Deployments** tab
3. Click the **three dots (...)** on the latest deployment
4. Click **Redeploy**
5. Select **Use existing Build Cache** (faster)
6. Click **Redeploy**

**OR** push a new commit to trigger automatic deployment.

---

## 4. Verify Configuration

After deployment completes (2-3 minutes):

### Test Error Capture

```bash
# Test server-side error
curl https://www.ottowrite.app/api/test-sentry?type=server

# Test critical priority error
curl https://www.ottowrite.app/api/test-sentry?type=critical

# Test high priority error
curl https://www.ottowrite.app/api/test-sentry?type=high
```

### Check Sentry Dashboard

1. Go to: https://sentry.io/organizations/ottowrite/issues/
2. You should see test errors appear within 1-2 minutes
3. Verify they have the correct tags:
   - `error_priority: critical` or `high`
   - `error_category: database` or `ai`
   - `alert_rule: [rule name]`
   - `request_id: [uuid]`

### Check Source Maps

1. Click on any error in Sentry
2. Look at the stack trace
3. Verify you see actual source code (not minified)
4. File paths should show: `app/api/test-sentry/route.ts:XX`

---

## 5. Clean Up Test Errors (Optional)

After verifying everything works:

1. Go to Sentry → Issues
2. Select the `[TEST]` errors
3. Click **Resolve** to clear them
4. Or just leave them - they'll auto-archive

---

## Troubleshooting

### Errors Not Appearing in Sentry

**Check deployment logs:**
```bash
# View build logs in Vercel dashboard
# Look for Sentry source map upload messages
```

**Common issues:**
- Environment variables not saved correctly
- Deployment didn't rebuild (check timestamp)
- `NODE_ENV` not set to `production`

**Verify env vars are loaded:**
- Go to Vercel → Deployments → [latest] → Functions
- Click on any function
- Check "Environment Variables" section

### Source Maps Not Working

**Check build logs for:**
```
[Sentry] Info: Successfully uploaded source maps to Sentry
```

**If missing:**
- Verify `SENTRY_AUTH_TOKEN` is set and encrypted
- Check `SENTRY_ORG` and `SENTRY_PROJECT` match exactly
- Token may need more permissions (should have `project:releases`)

### Vercel Fair Use Limit

**Your account is currently blocked from CLI operations.**

To resolve:
1. Review usage at: https://vercel.com/emmanuels-projects-15fbaf71/usage
2. Contact Vercel support if needed
3. Consider upgrading plan if at free tier limits

**For now:** Use Vercel dashboard for all environment variable changes

---

## Summary Checklist

- [ ] Add NEXT_PUBLIC_SENTRY_DSN (plain text)
- [ ] Add SENTRY_ORG (plain text)
- [ ] Add SENTRY_PROJECT (plain text)
- [ ] Add SENTRY_AUTH_TOKEN (encrypted)
- [ ] Add NEXT_PUBLIC_SENTRY_ENVIRONMENT (plain text)
- [ ] Trigger new deployment
- [ ] Test error capture with `/api/test-sentry`
- [ ] Verify errors appear in Sentry dashboard
- [ ] Verify source maps are working
- [ ] Set up alert rules in Sentry (see SENTRY_PRODUCTION_SETUP.md)

---

## Next Steps

After Sentry is working:

1. **Set up alert rules** - Follow `docs/SENTRY_PRODUCTION_SETUP.md` Step 4
2. **Configure Slack integration** (optional) - For critical error notifications
3. **Remove test endpoint** - Delete or disable `app/api/test-sentry/route.ts` in production
4. **Monitor usage** - Check Sentry → Settings → Usage & Billing weekly

---

**Estimated time:** 10-15 minutes to add all variables and redeploy
