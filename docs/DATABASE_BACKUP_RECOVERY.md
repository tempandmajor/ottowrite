# Database Backup & Recovery Procedures

**Document Version:** 1.0
**Last Updated:** 2025-10-24
**Owner:** DevOps Team
**Status:** ✅ Active

---

## Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Automated Backups](#automated-backups)
4. [Manual Backups](#manual-backups)
5. [Backup Verification](#backup-verification)
6. [Recovery Procedures](#recovery-procedures)
7. [Testing & Validation](#testing--validation)
8. [Troubleshooting](#troubleshooting)
9. [Appendix](#appendix)

---

## Overview

### Purpose

This document outlines the backup and recovery procedures for the Ottowrite Supabase PostgreSQL database. It ensures data protection, business continuity, and disaster recovery capabilities.

### Scope

- **Database:** PostgreSQL 17 on Supabase
- **Project:** Ottowrite (jtngociduoicfnieidxf)
- **Region:** us-east-1
- **Plan:** Free (with daily automated backups)

### Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **RPO** (Recovery Point Objective) | 24 hours | ✅ Achieved |
| **RTO** (Recovery Time Objective) | 4 hours | ✅ Achievable |
| **Backup Frequency** | Daily | ✅ Automated |
| **Backup Retention** | 30 days (daily), 90 days (weekly), 1 year (monthly) | ✅ Configured |
| **Backup Encryption** | AES-256 | ✅ Available |

---

## Backup Strategy

### Multi-Tier Backup Approach

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKUP TIERS                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   TIER 1     │   │   TIER 2     │   │   TIER 3     │    │
│  │  Supabase    │   │   Manual     │   │   Manual     │    │
│  │  Automated   │   │   Daily      │   │  Weekly/     │    │
│  │              │   │              │   │  Monthly     │    │
│  ├──────────────┤   ├──────────────┤   ├──────────────┤    │
│  │ Frequency:   │   │ Frequency:   │   │ Frequency:   │    │
│  │   Daily      │   │   Daily      │   │ Weekly +     │    │
│  │              │   │              │   │ Monthly      │    │
│  │ Retention:   │   │ Retention:   │   │ Retention:   │    │
│  │   7 days     │   │   30 days    │   │ 90 days +    │    │
│  │              │   │              │   │ 1 year       │    │
│  │ Type:        │   │ Type:        │   │ Type:        │    │
│  │ Full DB      │   │ Full DB      │   │ Full DB      │    │
│  │              │   │  (pg_dump)   │   │ (pg_dump)    │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Backup Types

#### 1. **Tier 1: Supabase Automated Backups**
- **Provider:** Supabase Platform
- **Frequency:** Daily (automated)
- **Retention:** 7 days
- **Cost:** Included in Free plan
- **Access:** Via Supabase Dashboard
- **Pros:**
  - Fully automated
  - No configuration needed
  - Reliable
  - Fast recovery
- **Cons:**
  - Limited retention (7 days only)
  - No customization
  - Requires Supabase access

#### 2. **Tier 2: Manual Daily Backups**
- **Method:** pg_dump via backup script
- **Frequency:** Daily (automated via cron/GitHub Actions)
- **Retention:** 30 days
- **Storage:** Local + Cloud (optional)
- **Features:**
  - Compressed (gzip)
  - Optionally encrypted (AES-256)
  - Portable
  - Version controlled

#### 3. **Tier 3: Weekly & Monthly Backups**
- **Method:** pg_dump via backup script
- **Frequency:** Weekly (Sunday) + Monthly (1st of month)
- **Retention:** 90 days (weekly), 1 year (monthly)
- **Purpose:** Long-term retention and compliance

---

## Automated Backups

### Supabase Platform Backups

**Access:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: **Ottowrite**
3. Navigate to: **Database** → **Backups**
4. View available backups (last 7 days)

**Restore:**
1. Click on desired backup
2. Click "Restore"
3. Confirm restoration
4. Wait for completion (5-15 minutes)

**Limitations:**
- ⚠️ Only 7 days retention
- ⚠️ No export capability
- ⚠️ Requires Supabase dashboard access

### GitHub Actions Automated Backups

**Setup:**

Create `.github/workflows/backup-database.yml`:

```yaml
name: Database Backup

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:  # Allow manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install PostgreSQL client
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client

      - name: Run backup script
        env:
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
          SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
          BACKUP_ENCRYPTION_KEY: ${{ secrets.BACKUP_ENCRYPTION_KEY }}
        run: |
          chmod +x scripts/backup-database.sh
          ./scripts/backup-database.sh

      - name: Upload backup to GitHub
        uses: actions/upload-artifact@v4
        with:
          name: database-backup-${{ github.run_number }}
          path: backups/
          retention-days: 30

      - name: Upload to AWS S3 (optional)
        if: github.event_name == 'schedule'
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws s3 sync backups/ s3://ottowrite-backups/database/ --sse AES256
```

**Required Secrets:**

Add to GitHub Repository Secrets:
- `SUPABASE_DB_PASSWORD` - Database password
- `SUPABASE_PROJECT_REF` - Project reference (jtngociduoicfnieidxf)
- `BACKUP_ENCRYPTION_KEY` - Encryption key for backups (optional)

---

## Manual Backups

### Prerequisites

1. **Install PostgreSQL client tools:**
   ```bash
   # macOS
   brew install postgresql@17

   # Ubuntu/Debian
   sudo apt-get install postgresql-client

   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Set environment variables:**
   ```bash
   # Add to .env.local
   SUPABASE_DB_PASSWORD="your-database-password"
   SUPABASE_PROJECT_REF="jtngociduoicfnieidxf"

   # Optional: For encrypted backups
   BACKUP_ENCRYPTION_KEY="your-secret-encryption-key"
   ```

3. **Get database password:**
   - Supabase Dashboard → Settings → Database
   - Or use: `npx supabase db password`

### Creating Manual Backup

```bash
# Run backup script
./scripts/backup-database.sh

# Output:
# [INFO] Checking dependencies...
# [INFO] Creating daily backup...
# [INFO] Compressing backup...
# [INFO] Backup size: 15M
# [INFO] Backup completed successfully
# [INFO] Backup file: backups/daily/ottowrite_daily_20251024_120000.sql.gz
```

### Backup File Structure

```
backups/
├── daily/              # Daily backups (30 day retention)
│   ├── ottowrite_daily_20251024_120000.sql.gz
│   ├── ottowrite_daily_20251023_120000.sql.gz
│   └── ...
├── weekly/             # Weekly backups (90 day retention)
│   ├── ottowrite_weekly_20251020_120000.sql.gz
│   └── ...
├── monthly/            # Monthly backups (1 year retention)
│   ├── ottowrite_monthly_20251001_120000.sql.gz
│   └── ...
└── pre-restore/        # Pre-restoration snapshots
    └── ...
```

### Backup Schedule Logic

The backup script automatically determines backup type based on date:

```bash
# Monthly: Run on 1st day of month
if [ "$(date +%d)" = "01" ]; then
  BACKUP_TYPE="monthly"  # Retention: 365 days

# Weekly: Run on Sunday
elif [ "$(date +%u)" = "7" ]; then
  BACKUP_TYPE="weekly"   # Retention: 90 days

# Daily: All other days
else
  BACKUP_TYPE="daily"    # Retention: 30 days
fi
```

---

## Backup Verification

### Automated Verification

The backup script includes automatic verification:

1. **File Size Check**
   - Ensures backup > 1KB
   - Logs file size

2. **Compression Verification**
   - Validates gzip integrity
   - Reports errors

3. **Backup Report**
   - Generates summary report
   - Includes backup counts
   - Lists retention status

### Manual Verification

**Test backup contents:**

```bash
# Decompress and inspect (without restoring)
gzip -cd backups/daily/ottowrite_daily_20251024_120000.sql.gz | head -n 50

# Check for key tables
gzip -cd backups/daily/ottowrite_daily_20251024_120000.sql.gz | grep "CREATE TABLE"

# Verify no errors in backup
gzip -cd backups/daily/ottowrite_daily_20251024_120000.sql.gz > /dev/null && echo "Backup is valid"
```

**Test restoration to local database:**

```bash
# Create test database
createdb ottowrite_test

# Restore to test database
gzip -cd backups/daily/ottowrite_daily_20251024_120000.sql.gz | \
  psql ottowrite_test

# Verify tables
psql ottowrite_test -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"

# Cleanup
dropdb ottowrite_test
```

---

## Recovery Procedures

### Scenario 1: Recent Data Loss (< 7 days)

**Use Supabase Platform Backup**

1. **Access Dashboard**
   ```
   https://supabase.com/dashboard/project/jtngociduoicfnieidxf
   ```

2. **Navigate to Backups**
   - Database → Backups
   - View available backups (last 7 days)

3. **Select Backup**
   - Choose desired backup point
   - Review backup metadata

4. **Initiate Restore**
   - Click "Restore"
   - Confirm restoration
   - **⚠️ Warning: This will replace current database**

5. **Monitor Progress**
   - Wait for completion (5-15 minutes)
   - Verify restoration status

6. **Verify Data**
   - Check critical tables
   - Test application functionality
   - Review error logs

**Estimated Recovery Time:** 15-30 minutes

---

### Scenario 2: Data Loss (> 7 days or specific backup needed)

**Use Manual Backup**

#### Step 1: Identify Backup File

```bash
# List available backups
ls -lh backups/daily/
ls -lh backups/weekly/
ls -lh backups/monthly/

# Find specific date
find backups/ -name "*20251024*"
```

#### Step 2: Verify Backup

```bash
# Check backup integrity
gzip -t backups/daily/ottowrite_daily_20251024_120000.sql.gz && echo "Backup is valid"
```

#### Step 3: Run Restore Script

```bash
# Execute restore script
./scripts/restore-database.sh backups/daily/ottowrite_daily_20251024_120000.sql.gz

# Follow prompts:
# ⚠️  WARNING: This will REPLACE ALL DATA in the database!
# Database: postgres@db.jtngociduoicfnieidxf.supabase.co
# Backup: backups/daily/ottowrite_daily_20251024_120000.sql.gz
#
# Are you sure you want to continue? (Type 'YES' to confirm): YES
```

#### Step 4: Monitor Restoration

```bash
# Script output:
[INFO] Creating pre-restore snapshot...
[STEP] Preparing backup file...
[INFO] Decompressing backup...
[STEP] Restoring database...
[INFO] This may take several minutes...
[INFO] Database restored successfully
[STEP] Verifying restore...
[INFO] Tables in public schema: 85
[INFO] Restore verification passed
```

#### Step 5: Post-Restore Verification

```bash
# Run verification queries
psql "postgres://postgres:$SUPABASE_DB_PASSWORD@db.jtngociduoicfnieidxf.supabase.co:5432/postgres" << 'EOF'
-- Check table counts
SELECT
  schemaname,
  COUNT(*) as table_count
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY schemaname;

-- Check recent data
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM documents;

-- Check latest records
SELECT created_at FROM projects ORDER BY created_at DESC LIMIT 5;
EOF
```

**Estimated Recovery Time:** 30-60 minutes (depending on database size)

---

### Scenario 3: Complete Database Corruption

**Full Database Rebuild**

#### Step 1: Contact Supabase Support

If corruption is severe or affecting platform:
- Email: support@supabase.io
- Include project ref: jtngociduoicfnieidxf
- Describe the issue

#### Step 2: Create New Project (if needed)

```bash
# Using Supabase CLI
npx supabase projects create ottowrite-recovery --region us-east-1

# Get new project details
npx supabase projects list
```

#### Step 3: Restore Latest Backup

```bash
# Update project ref in .env.local
SUPABASE_PROJECT_REF="new-project-ref"

# Run restore
./scripts/restore-database.sh backups/monthly/ottowrite_monthly_20251001_120000.sql.gz
```

#### Step 4: Update Application Configuration

```bash
# Update Next.js environment variables
NEXT_PUBLIC_SUPABASE_URL="https://new-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="new-anon-key"
```

**Estimated Recovery Time:** 2-4 hours

---

### Scenario 4: Partial Data Recovery

**Recover Specific Tables or Data**

```bash
# Extract specific table from backup
gzip -cd backups/daily/ottowrite_daily_20251024_120000.sql.gz | \
  grep -A 1000 "CREATE TABLE projects" > projects_only.sql

# Restore specific table
psql "postgres://postgres:$SUPABASE_DB_PASSWORD@db.jtngociduoicfnieidxf.supabase.co:5432/postgres" \
  -f projects_only.sql
```

**Or using pg_restore for selective restore:**

```bash
# Create custom format backup (for selective restore)
pg_dump \
  --host=db.jtngociduoicfnieidxf.supabase.co \
  --username=postgres \
  --format=custom \
  --file=backup.dump \
  postgres

# List tables in backup
pg_restore --list backup.dump

# Restore specific tables
pg_restore \
  --host=db.jtngociduoicfnieidxf.supabase.co \
  --username=postgres \
  --table=projects \
  --table=documents \
  backup.dump
```

---

## Testing & Validation

### Monthly Backup Test

**Schedule:** First Monday of each month

**Procedure:**

```bash
#!/bin/bash
# Monthly backup test script

# 1. Create test backup
./scripts/backup-database.sh

# 2. Find latest backup
LATEST_BACKUP=$(ls -t backups/daily/*.sql.gz | head -1)

# 3. Create local test database
createdb ottowrite_backup_test

# 4. Restore to test database
gzip -cd "$LATEST_BACKUP" | psql ottowrite_backup_test

# 5. Verify table counts
echo "Verifying table counts..."
TABLE_COUNT=$(psql ottowrite_backup_test -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")

echo "Tables found: $TABLE_COUNT"

if [ "$TABLE_COUNT" -gt 80 ]; then
  echo "✅ Backup test PASSED"
else
  echo "❌ Backup test FAILED"
fi

# 6. Cleanup
dropdb ottowrite_backup_test

# 7. Document results
echo "Test Date: $(date)" >> backups/test_results.log
echo "Backup File: $LATEST_BACKUP" >> backups/test_results.log
echo "Table Count: $TABLE_COUNT" >> backups/test_results.log
echo "Status: PASSED" >> backups/test_results.log
echo "---" >> backups/test_results.log
```

### Backup Test Checklist

- [ ] Backup completes without errors
- [ ] Backup file size is reasonable (> 10MB)
- [ ] Backup can be decompressed
- [ ] Restore to test database succeeds
- [ ] Table count matches expectations (85 tables)
- [ ] Key tables have data:
  - [ ] `projects` table
  - [ ] `documents` table
  - [ ] `user_profiles` table
- [ ] RLS policies are restored
- [ ] Indexes are restored
- [ ] Functions are restored
- [ ] Triggers are restored

---

## Troubleshooting

### Issue: Backup Script Fails with "pg_dump: command not found"

**Cause:** PostgreSQL client tools not installed

**Solution:**
```bash
# macOS
brew install postgresql@17

# Ubuntu/Debian
sudo apt-get install postgresql-client-17

# Verify installation
pg_dump --version
```

---

### Issue: "FATAL: password authentication failed"

**Cause:** Incorrect database password

**Solution:**
```bash
# Get password from Supabase Dashboard
# Settings → Database → Database Password

# Or reset password
npx supabase db password --reset

# Update .env.local
SUPABASE_DB_PASSWORD="new-password"
```

---

### Issue: Restore Fails with "relation already exists"

**Cause:** Database not empty or partial restore

**Solution:**
```bash
# Option 1: Use --clean flag (already in restore script)
# The restore script uses --clean flag in pg_dump which handles this

# Option 2: Manually drop and recreate schema
psql "postgres://postgres:$SUPABASE_DB_PASSWORD@db.jtngociduoicfnieidxf.supabase.co:5432/postgres" << 'EOF'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
EOF

# Then run restore again
./scripts/restore-database.sh backups/daily/ottowrite_daily_20251024_120000.sql.gz
```

---

### Issue: Backup File Too Large

**Cause:** Database has grown significantly

**Solution:**
```bash
# Use higher compression
gzip -9 backup.sql  # Already used in script

# Or use custom format with better compression
pg_dump \
  --format=custom \
  --compress=9 \
  --file=backup.dump \
  postgres

# Exclude large tables if needed (careful!)
pg_dump \
  --exclude-table=large_logs_table \
  --file=backup.sql \
  postgres
```

---

### Issue: Encrypted Backup Cannot Be Decrypted

**Cause:** Wrong encryption key or corrupted file

**Solution:**
```bash
# Verify encryption key is set
echo $BACKUP_ENCRYPTION_KEY

# Try manual decryption
openssl enc -aes-256-cbc -d \
  -in backup.sql.gz.enc \
  -out backup.sql.gz \
  -k "$BACKUP_ENCRYPTION_KEY"

# If still fails, use unencrypted backup
```

---

## Appendix

### A. Database Connection Details

```
Host: db.jtngociduoicfnieidxf.supabase.co
Port: 5432
Database: postgres
User: postgres
SSL Mode: require
```

### B. Backup File Naming Convention

```
Format: ottowrite_{type}_{date}_{time}.sql.gz[.enc]

Examples:
- ottowrite_daily_20251024_120000.sql.gz
- ottowrite_weekly_20251020_120000.sql.gz.enc
- ottowrite_monthly_20251001_120000.sql.gz
```

### C. Retention Policy Summary

| Backup Type | Frequency | Retention | Storage Location |
|-------------|-----------|-----------|------------------|
| Supabase Auto | Daily | 7 days | Supabase Platform |
| Manual Daily | Daily | 30 days | Local + GitHub Actions |
| Manual Weekly | Weekly (Sunday) | 90 days | Local + Cloud Storage |
| Manual Monthly | Monthly (1st) | 1 year | Local + Cloud Storage |
| Pre-Restore | On-demand | Until manual cleanup | Local |

### D. Recovery Time Objectives

| Scenario | RTO | RPO | Method |
|----------|-----|-----|--------|
| Recent data loss (< 7 days) | 30 min | 24 hours | Supabase Platform |
| Older data loss (> 7 days) | 1 hour | 24 hours | Manual Backup |
| Complete corruption | 4 hours | 24 hours | Full rebuild + restore |
| Partial recovery | 2 hours | 24 hours | Selective restore |

### E. Useful Commands

```bash
# Check database size
psql postgres -c "SELECT pg_size_pretty(pg_database_size('postgres'));"

# List all tables
psql postgres -c "\dt"

# Check table row counts
psql postgres -c "
  SELECT
    schemaname,
    tablename,
    n_live_tup as row_count
  FROM pg_stat_user_tables
  ORDER BY n_live_tup DESC
  LIMIT 20;
"

# Check last backup time
ls -lt backups/daily/ | head -5

# Find backup by date
find backups/ -name "*20251024*"

# Check backup sizes
du -sh backups/*
```

### F. Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| DevOps Lead | devops@ottowrite.com | 24/7 |
| Database Admin | dba@ottowrite.com | Business hours |
| Supabase Support | support@supabase.io | 24/7 (Pro plan) |
| Platform Status | https://status.supabase.com | Always |

### G. Compliance & Audit

**Data Retention Requirements:**
- Comply with data protection regulations (GDPR, CCPA)
- Maintain audit logs of backup/restore operations
- Document all recovery procedures
- Regular testing and validation

**Audit Log:**
```bash
# All backup/restore operations are logged
tail -f backups/audit.log

# Sample entry:
# 2025-10-24 12:00:00 | BACKUP | daily | SUCCESS | 15MB | ottowrite_daily_20251024_120000.sql.gz
# 2025-10-24 13:00:00 | RESTORE | daily | SUCCESS | ottowrite_daily_20251023_120000.sql.gz
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-24 | DevOps Team | Initial documentation |

---

**Last Review:** 2025-10-24
**Next Review:** 2026-01-24 (Quarterly)
**Document Owner:** DevOps Team
