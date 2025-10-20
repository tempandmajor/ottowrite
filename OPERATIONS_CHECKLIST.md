# Ottowrite Operations Checklist

**Last Updated:** 2025-10-20
**Status:** ✅ Production Ready
**Environment:** Production (Vercel + Supabase)

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Database Migrations](#database-migrations)
3. [RLS Security Audit](#rls-security-audit)
4. [Backup Procedures](#backup-procedures)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Incident Response](#incident-response)
7. [Deployment Checklist](#deployment-checklist)

---

## Environment Variables

### Required Environment Variables

#### Vercel Production Environment
✅ All variables verified as present in Vercel (Production, Preview, Development)

**Supabase Configuration:**
```bash
NEXT_PUBLIC_SUPABASE_URL          # Public Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Public anonymous key for client-side
SUPABASE_URL                      # Server-side Supabase URL
SUPABASE_ANON_KEY                 # Server-side anonymous key
SUPABASE_SERVICE_ROLE_KEY         # Admin key (local only, not in Vercel)
```

**Stripe Configuration:**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY    # Public Stripe key for client-side
STRIPE_SECRET_KEY                     # Secret key for server-side API calls
STRIPE_WEBHOOK_SECRET                 # Webhook signature verification

# Pricing IDs (both public and private)
NEXT_PUBLIC_STRIPE_PRICE_HOBBYIST
STRIPE_PRICE_HOBBYIST
NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL
STRIPE_PRICE_PROFESSIONAL
NEXT_PUBLIC_STRIPE_PRICE_STUDIO
STRIPE_PRICE_STUDIO
```

**Optional Configuration:**
```bash
SUPABASE_COOKIE_DOMAIN=.ottowrite.com    # For cross-subdomain sessions (not currently set)
```

#### Local Development (.env.local)
✅ All required variables present in `.env.local`

**Additional Local Variables:**
- `SUPABASE_SERVICE_ROLE_KEY` - For admin operations during development

### Verification Commands

```bash
# Check local environment variables
grep -E "(STRIPE|SUPABASE)" .env.local | grep -v "^#"

# Check Vercel environment variables
vercel env ls

# Check specific environment in Vercel
vercel env ls production
vercel env ls preview
vercel env ls development
```

---

## Database Migrations

### Applied Migrations (27 Total)

Last migration applied: **20251020015431** (profile_preferences)

| Version | Name | Description | Date Applied |
|---------|------|-------------|--------------|
| 20251016063721 | create_initial_schema | Initial database schema | 2025-10-16 |
| 20251016081248 | add_subscription_tracking_fields | Stripe subscription tracking | 2025-10-16 |
| 20251016081259 | update_ai_usage_tracking | AI usage metrics | 2025-10-16 |
| 20251017160247 | version_history | Document version history | 2025-10-17 |
| 20251017160248 | templates | Document templates system | 2025-10-17 |
| 20251017163539 | story_structure | Story structure tools | 2025-10-17 |
| 20251019025038 | document_snapshots | Document snapshot system | 2025-10-19 |
| 20251019025146 | character_voice_analysis | Character voice tracking | 2025-10-19 |
| 20251019025150 | world_elements | World building elements | 2025-10-19 |
| 20251019025156 | ai_background_tasks | Background AI task queue | 2025-10-19 |
| 20251019025830 | research_notes | Research notes system | 2025-10-19 |
| 20251019025853 | writing_analytics | Writing analytics tracking | 2025-10-19 |
| 20251019025910 | screenplay_board | Screenplay beat board | 2025-10-19 |
| 20251019025926 | ensemble_feedback | Ensemble feedback system | 2025-10-19 |
| 20251019030024 | phase3_foundations | Phase 3 foundation tables | 2025-10-19 |
| 20251019030048 | plan_enforcement | Usage quota enforcement | 2025-10-19 |
| 20251019030108 | plan_limits_enhancements | Enhanced plan limits | 2025-10-19 |
| 20251019030132 | refresh_user_plan_usage | User plan usage tracking | 2025-10-19 |
| 20251019030157 | collaboration_members | Project collaboration | 2025-10-19 |
| 20251019043414 | ai_requests | AI request logging | 2025-10-19 |
| 20251019061131 | autosave_failures | Autosave failure tracking | 2025-10-19 |
| 20251019150238 | performance_indexes_v2 | Database performance indexes | 2025-10-19 |
| 20251019175747 | add_undo_redo_history | Undo/redo persistence | 2025-10-19 |
| 20251019193303 | add_analytics_queue | Analytics queue system | 2025-10-19 |
| 20251019211549 | add_metrics_schema | Metrics schema | 2025-10-19 |
| 20251020010234 | ai_routing_metadata | AI routing observability | 2025-10-20 |
| 20251020015431 | profile_preferences | User profile preferences | 2025-10-20 |

### Migration Verification

```bash
# List all applied migrations
SUPABASE_ACCESS_TOKEN=<token> supabase db diff --linked

# Check migration status
SUPABASE_ACCESS_TOKEN=<token> supabase db pull

# Apply pending migrations
SUPABASE_ACCESS_TOKEN=<token> PGPASSWORD="<password>" supabase db push
```

---

## RLS Security Audit

**Last Audit:** 2025-10-20
**Status:** ✅ All policies verified secure

### Critical Tables RLS Status

| Table | RLS Enabled | Policies Count | Status |
|-------|-------------|----------------|--------|
| user_profiles | ✅ Yes | 2 | ✅ Secure |
| documents | ✅ Yes | 4 | ✅ Secure |
| document_snapshots | ✅ Yes | 3 | ⚠️ Missing UPDATE |
| document_undo_history | ✅ Yes | 4 | ✅ Secure |
| projects | ✅ Yes | 4 | ✅ Secure |
| ai_usage | ✅ Yes | 2 | ✅ Secure |
| ai_requests | ✅ Yes | 2 | ✅ Secure |
| ai_background_tasks | ✅ Yes | 3 | ✅ Secure |

### RLS Policy Details

#### document_undo_history (✅ Secure)
- **SELECT:** `auth.uid() = user_id` ✅
- **INSERT:** `WITH CHECK (auth.uid() = user_id)` ✅
- **UPDATE:** `auth.uid() = user_id` + `WITH CHECK (auth.uid() = user_id)` ✅
- **DELETE:** `auth.uid() = user_id` ✅

**Security Level:** ✅ Excellent - Full CRUD protection with WITH CHECK clauses

#### document_snapshots (⚠️ Missing UPDATE Policy)
- **SELECT:** `user_id = auth.uid()` ✅
- **INSERT:** `WITH CHECK (user_id = auth.uid())` ✅
- **DELETE:** `user_id = auth.uid()` ✅
- **UPDATE:** ❌ **MISSING** - Users cannot update snapshots

**Security Level:** ⚠️ Good - Missing UPDATE policy (snapshots should be immutable, so this is acceptable)

#### ai_usage (✅ Secure)
- **SELECT:** `auth.uid() = user_id` ✅
- **INSERT:** `WITH CHECK (auth.uid() = user_id)` ✅

**Security Level:** ✅ Good - Insert-only logging table

#### ai_requests (✅ Secure)
- **SELECT:** `auth.uid() = user_id` ✅
- **INSERT:** `WITH CHECK (auth.uid() = user_id)` ✅

**Security Level:** ✅ Good - Insert-only logging table

#### ai_background_tasks (✅ Secure)
- **SELECT:** `auth.uid() = user_id` ✅
- **INSERT:** `WITH CHECK (auth.uid() = user_id)` ✅
- **UPDATE:** `auth.uid() = user_id` + `WITH CHECK (auth.uid() = user_id)` ✅

**Security Level:** ✅ Excellent - Full protection with WITH CHECK clauses

### Security Recommendations

1. ✅ **All tables have RLS enabled** - No tables allow unrestricted access
2. ✅ **All policies use `auth.uid()`** - Proper user isolation
3. ✅ **WITH CHECK clauses present** - Prevents privilege escalation on INSERT/UPDATE
4. ⚠️ **Consider adding UPDATE policy to document_snapshots** - If users need to update metadata (or document why it's intentionally missing)

### RLS Audit Commands

```sql
-- Check RLS status for all tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- Find tables without RLS enabled
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND rowsecurity = false;
```

---

## Backup Procedures

### Supabase Automatic Backups

**Plan:** Professional (inherited from Supabase project tier)

- **Point-in-Time Recovery (PITR):** Available
- **Retention:** 7 days
- **Backup Frequency:** Continuous (PITR)
- **Storage Location:** Supabase managed storage

### Manual Backup Procedures

#### 1. Database Schema Backup

```bash
# Export schema only
SUPABASE_ACCESS_TOKEN=<token> supabase db dump --schema-only > schema_backup_$(date +%Y%m%d).sql

# Export schema with data
SUPABASE_ACCESS_TOKEN=<token> supabase db dump > full_backup_$(date +%Y%m%d).sql
```

#### 2. Critical Table Exports

```bash
# Export user data
psql $DATABASE_URL -c "\COPY user_profiles TO 'user_profiles_$(date +%Y%m%d).csv' CSV HEADER"

# Export documents
psql $DATABASE_URL -c "\COPY documents TO 'documents_$(date +%Y%m%d).csv' CSV HEADER"

# Export projects
psql $DATABASE_URL -c "\COPY projects TO 'projects_$(date +%Y%m%d).csv' CSV HEADER"
```

#### 3. Environment Variables Backup

```bash
# Backup Vercel environment variables
vercel env pull .env.production.backup

# Backup local environment
cp .env.local .env.local.backup.$(date +%Y%m%d)
```

### Restore Procedures

#### Point-in-Time Restore (via Supabase Dashboard)

1. Navigate to Supabase project dashboard
2. Click "Database" → "Backups"
3. Select restore point (up to 7 days ago)
4. Click "Restore"
5. Confirm restoration

#### Manual Restore

```bash
# Restore from SQL dump
psql $DATABASE_URL < backup_file.sql

# Restore specific table
psql $DATABASE_URL -c "\COPY table_name FROM 'backup.csv' CSV HEADER"
```

### Backup Schedule

| Backup Type | Frequency | Retention | Automated |
|-------------|-----------|-----------|-----------|
| PITR | Continuous | 7 days | ✅ Yes (Supabase) |
| Schema Dump | Weekly | 30 days | ❌ Manual |
| Full Database | Monthly | 90 days | ❌ Manual |
| Env Vars | On Change | Indefinite | ❌ Manual |

---

## Monitoring & Alerts

### Supabase Monitoring

**Access:** https://supabase.com/dashboard/project/jtngociduoicfnieidxf

#### Key Metrics to Monitor

1. **Database Health**
   - CPU usage (Alert if > 80%)
   - Memory usage (Alert if > 85%)
   - Active connections (Alert if > 90% of limit)
   - Disk usage (Alert if > 80%)

2. **API Performance**
   - Request rate
   - Error rate (Alert if > 1%)
   - Average response time (Alert if > 500ms)
   - 95th percentile latency

3. **Authentication**
   - Active users
   - Login success rate
   - Failed login attempts (Alert if > 10 in 5 minutes)

### Vercel Monitoring

**Access:** https://vercel.com/emmanuels-projects-15fbaf71/ottowrite

#### Key Metrics

1. **Build Status**
   - Build success rate (Alert on failure)
   - Build duration (Alert if > 5 minutes)

2. **Runtime Performance**
   - Function execution time
   - Function memory usage
   - Edge function errors

3. **Traffic**
   - Request volume
   - Bandwidth usage
   - Geographic distribution

### Stripe Monitoring

**Access:** https://dashboard.stripe.com

#### Key Metrics

1. **Payment Processing**
   - Successful payments
   - Failed payments (Alert if rate > 5%)
   - Refund requests

2. **Subscription Health**
   - Active subscriptions
   - Churn rate
   - Failed subscription renewals

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Database CPU | 70% | 85% | Scale database |
| API Error Rate | 0.5% | 2% | Check logs |
| Failed Logins | 5/min | 15/min | Check for attack |
| Build Failures | 1 | 3 consecutive | Check code |
| Payment Failures | 3% | 8% | Verify Stripe integration |

### Log Access

```bash
# View Supabase API logs
# Via MCP tool: mcp__supabase__get_logs

# View Vercel deployment logs
vercel logs <deployment-url>

# View real-time logs
vercel logs --follow
```

---

## Incident Response

### Incident Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Primary Developer | Emmanuel | 24/7 |
| DevOps | Emmanuel | 24/7 |
| Database Admin | Emmanuel | 24/7 |
| Support Lead | TBD | Business Hours |

### Emergency Procedures

#### 1. Database Emergency

**Symptoms:** Database down, connection errors, data corruption

**Actions:**
1. Check Supabase status: https://status.supabase.com
2. Review database logs via Supabase dashboard
3. If corruption: Initiate PITR restore to last known good state
4. If down: Wait for Supabase resolution or contact support
5. Notify users via status page

**Rollback Plan:**
```bash
# Restore to point in time (via Supabase dashboard)
# 1. Database → Backups → Select timestamp → Restore
```

#### 2. Deployment Failure

**Symptoms:** Build errors, deployment errors, 500 errors in production

**Actions:**
1. Check Vercel deployment logs
2. Identify failing commit
3. Roll back to previous deployment
4. Fix issue locally
5. Re-deploy with fix

**Rollback Command:**
```bash
# Revert to previous production deployment
vercel --prod alias <previous-deployment-url>

# Or via Vercel dashboard: Deployments → Previous → Promote
```

#### 3. Security Incident

**Symptoms:** Unauthorized access, data breach, suspicious activity

**Actions:**
1. **Immediate:** Rotate all API keys and secrets
2. Check Supabase auth logs for suspicious logins
3. Review RLS policies for vulnerabilities
4. Enable 2FA for all admin accounts
5. Notify affected users
6. Document incident and remediation

**Emergency Key Rotation:**
```bash
# Rotate Supabase keys (via dashboard)
# Settings → API → Reset anon key

# Rotate Stripe keys (via dashboard)
# Developers → API keys → Roll key

# Update Vercel environment variables
vercel env rm SUPABASE_ANON_KEY production
vercel env add SUPABASE_ANON_KEY production
```

#### 4. Performance Degradation

**Symptoms:** Slow page loads, timeouts, high latency

**Actions:**
1. Check database performance metrics
2. Identify slow queries in logs
3. Review recent code changes
4. Check for missing indexes
5. Consider scaling database

**Performance Investigation:**
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.5;
```

### Post-Incident Review

After any incident, complete a post-mortem:

1. Document what happened
2. Identify root cause
3. List what went well
4. List what went poorly
5. Create action items to prevent recurrence
6. Update this checklist with lessons learned

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Database migrations tested locally
- [ ] Environment variables verified
- [ ] RLS policies reviewed (if schema changes)
- [ ] Breaking changes documented

### Deployment Steps

1. **Database Migrations**
   ```bash
   # Apply migrations to production
   SUPABASE_ACCESS_TOKEN=<token> PGPASSWORD="<password>" supabase db push
   ```

2. **Code Deployment**
   ```bash
   # Commit and push to main
   git add .
   git commit -m "Description"
   git push origin main

   # Vercel auto-deploys from main branch
   ```

3. **Verification**
   - [ ] Deployment succeeds on Vercel
   - [ ] Health check endpoints respond
   - [ ] Database queries work
   - [ ] Authentication works
   - [ ] Payment processing works

### Post-Deployment

- [ ] Monitor error rates for 30 minutes
- [ ] Check Supabase logs for errors
- [ ] Verify critical user flows
- [ ] Update this checklist if needed
- [ ] Tag release in git
- [ ] Notify team of deployment

### Rollback Procedure

If deployment fails:

```bash
# Option 1: Revert via Vercel dashboard
# Deployments → Previous → Promote to Production

# Option 2: Revert git commit
git revert HEAD
git push origin main

# Option 3: Database rollback (if needed)
# Restore via Supabase PITR to pre-deployment timestamp
```

---

## Quick Reference

### Essential Commands

```bash
# Build and test
npm run build
npm test
npm run lint

# Database operations
SUPABASE_ACCESS_TOKEN=<token> supabase db push
SUPABASE_ACCESS_TOKEN=<token> supabase db diff

# Vercel operations
vercel --prod
vercel logs --follow
vercel env ls

# Check status
vercel ls
git status
```

### Important URLs

- **Production:** https://ottowrite.app
- **Vercel Dashboard:** https://vercel.com/emmanuels-projects-15fbaf71/ottowrite
- **Supabase Dashboard:** https://supabase.com/dashboard/project/jtngociduoicfnieidxf
- **Stripe Dashboard:** https://dashboard.stripe.com
- **GitHub Repository:** https://github.com/tempandmajor/ottowrite

### Emergency Contacts

- **Database Issues:** Supabase Support (https://supabase.com/support)
- **Hosting Issues:** Vercel Support (https://vercel.com/support)
- **Payment Issues:** Stripe Support (https://support.stripe.com)

---

**Document Version:** 1.0
**Next Review Date:** 2025-11-20
**Maintained By:** Emmanuel Akangbou
