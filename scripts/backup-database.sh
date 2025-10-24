#!/bin/bash

# Database Backup Script for Ottowrite
# Creates encrypted, compressed backups of the Supabase PostgreSQL database
#
# Usage:
#   ./scripts/backup-database.sh
#
# Requirements:
#   - Supabase CLI (npx supabase)
#   - PostgreSQL client tools (pg_dump)
#   - Environment variables set (.env.local)
#
# Backup Strategy:
#   - Daily backups retained for 30 days
#   - Weekly backups retained for 90 days
#   - Monthly backups retained for 1 year
#
# Exit codes:
#   0 - Success
#   1 - Missing dependencies
#   2 - Backup failed
#   3 - Upload failed

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

# Backup directory
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DAY=$(date +%u)  # 1-7 (Monday-Sunday)
BACKUP_DOM=$(date +%d)  # Day of month

# Backup types based on schedule
if [ "$BACKUP_DOM" = "01" ]; then
  BACKUP_TYPE="monthly"
  RETENTION_DAYS=365
elif [ "$BACKUP_DAY" = "7" ]; then
  BACKUP_TYPE="weekly"
  RETENTION_DAYS=90
else
  BACKUP_TYPE="daily"
  RETENTION_DAYS=30
fi

# Backup file paths
BACKUP_SUBDIR="${BACKUP_DIR}/${BACKUP_TYPE}"
BACKUP_FILE="${BACKUP_SUBDIR}/ottowrite_${BACKUP_TYPE}_${BACKUP_DATE}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"
BACKUP_FILE_ENC="${BACKUP_FILE_GZ}.enc"

# Project details
PROJECT_REF="${SUPABASE_PROJECT_REF:-jtngociduoicfnieidxf}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
  log_info "Checking dependencies..."

  local missing_deps=()

  # Check for required commands
  if ! command -v pg_dump &> /dev/null; then
    missing_deps+=("pg_dump (PostgreSQL client)")
  fi

  if ! command -v gzip &> /dev/null; then
    missing_deps+=("gzip")
  fi

  if ! command -v openssl &> /dev/null; then
    missing_deps+=("openssl")
  fi

  if [ ${#missing_deps[@]} -ne 0 ]; then
    log_error "Missing required dependencies:"
    for dep in "${missing_deps[@]}"; do
      echo "  - $dep"
    done
    exit 1
  fi

  log_info "All dependencies found"
}

check_credentials() {
  log_info "Checking database credentials..."

  if [ -z "$DB_PASSWORD" ]; then
    log_error "SUPABASE_DB_PASSWORD not set. Please set it in .env.local or environment."
    echo ""
    echo "You can find your database password in:"
    echo "1. Supabase Dashboard → Settings → Database"
    echo "2. Or generate a new password"
    exit 1
  fi

  log_info "Credentials found"
}

create_backup_dir() {
  log_info "Creating backup directory: $BACKUP_SUBDIR"
  mkdir -p "$BACKUP_SUBDIR"
}

# ============================================================================
# BACKUP FUNCTIONS
# ============================================================================

create_backup() {
  log_info "Creating ${BACKUP_TYPE} backup..."
  log_info "Backup file: $BACKUP_FILE_GZ"

  # Database connection details
  local DB_HOST="db.${PROJECT_REF}.supabase.co"
  local DB_PORT="5432"
  local DB_NAME="postgres"
  local DB_USER="postgres"

  # Set password for pg_dump
  export PGPASSWORD="$DB_PASSWORD"

  # Create backup using pg_dump
  log_info "Connecting to: $DB_HOST"

  if pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    --verbose \
    --file="$BACKUP_FILE" 2>&1 | grep -v "^pg_dump: warning:"; then

    log_info "Database dump completed successfully"

    # Compress the backup
    log_info "Compressing backup..."
    gzip -9 "$BACKUP_FILE"

    # Get backup size
    local BACKUP_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
    log_info "Backup size: $BACKUP_SIZE"

    # Unset password
    unset PGPASSWORD

    return 0
  else
    log_error "Database dump failed"
    unset PGPASSWORD
    return 2
  fi
}

encrypt_backup() {
  log_info "Encrypting backup..."

  # Check if encryption key is set
  if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
    log_warn "BACKUP_ENCRYPTION_KEY not set. Skipping encryption."
    log_warn "Set BACKUP_ENCRYPTION_KEY for encrypted backups."
    return 0
  fi

  # Encrypt using AES-256-CBC
  if openssl enc -aes-256-cbc \
    -salt \
    -in "$BACKUP_FILE_GZ" \
    -out "$BACKUP_FILE_ENC" \
    -k "$BACKUP_ENCRYPTION_KEY"; then

    log_info "Backup encrypted successfully"

    # Remove unencrypted backup
    rm "$BACKUP_FILE_GZ"

    return 0
  else
    log_error "Encryption failed"
    return 2
  fi
}

verify_backup() {
  log_info "Verifying backup integrity..."

  local BACKUP_TO_VERIFY="$BACKUP_FILE_GZ"

  # If encrypted, verify encrypted file
  if [ -f "$BACKUP_FILE_ENC" ]; then
    BACKUP_TO_VERIFY="$BACKUP_FILE_ENC"
  fi

  if [ -f "$BACKUP_TO_VERIFY" ]; then
    local FILE_SIZE=$(stat -f%z "$BACKUP_TO_VERIFY" 2>/dev/null || stat -c%s "$BACKUP_TO_VERIFY" 2>/dev/null || echo "0")

    if [ "$FILE_SIZE" -gt 1000 ]; then
      log_info "Backup verification passed (size: $FILE_SIZE bytes)"
      return 0
    else
      log_error "Backup file too small (size: $FILE_SIZE bytes)"
      return 2
    fi
  else
    log_error "Backup file not found: $BACKUP_TO_VERIFY"
    return 2
  fi
}

cleanup_old_backups() {
  log_info "Cleaning up old ${BACKUP_TYPE} backups (older than ${RETENTION_DAYS} days)..."

  # Find and delete old backups
  local DELETED_COUNT=0

  if [ -d "$BACKUP_SUBDIR" ]; then
    while IFS= read -r -d '' file; do
      rm "$file"
      ((DELETED_COUNT++))
    done < <(find "$BACKUP_SUBDIR" -name "ottowrite_${BACKUP_TYPE}_*.sql.gz*" -type f -mtime +${RETENTION_DAYS} -print0 2>/dev/null)

    if [ $DELETED_COUNT -gt 0 ]; then
      log_info "Deleted $DELETED_COUNT old backup(s)"
    else
      log_info "No old backups to delete"
    fi
  fi
}

generate_backup_report() {
  log_info "Generating backup report..."

  local REPORT_FILE="${BACKUP_SUBDIR}/backup_report_${BACKUP_DATE}.txt"

  cat > "$REPORT_FILE" <<EOF
Ottowrite Database Backup Report
Generated: $(date)

Backup Type: ${BACKUP_TYPE}
Backup Date: ${BACKUP_DATE}
Project: Ottowrite (${PROJECT_REF})
Region: us-east-1
Database: PostgreSQL 17

Backup Details:
- File: $(basename "$BACKUP_FILE_GZ")
- Size: $(du -h "$BACKUP_FILE_GZ" 2>/dev/null | cut -f1 || echo "N/A")
- Encrypted: $([ -f "$BACKUP_FILE_ENC" ] && echo "Yes" || echo "No")
- Retention: ${RETENTION_DAYS} days

Backup Counts:
- Daily backups: $(find "${BACKUP_DIR}/daily" -name "*.sql.gz*" 2>/dev/null | wc -l | tr -d ' ')
- Weekly backups: $(find "${BACKUP_DIR}/weekly" -name "*.sql.gz*" 2>/dev/null | wc -l | tr -d ' ')
- Monthly backups: $(find "${BACKUP_DIR}/monthly" -name "*.sql.gz*" 2>/dev/null | wc -l | tr -d ' ')

Status: ✅ Backup completed successfully
EOF

  log_info "Report saved to: $REPORT_FILE"
  cat "$REPORT_FILE"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  log_info "===== Ottowrite Database Backup ====="
  log_info "Backup Type: ${BACKUP_TYPE}"
  log_info "Date: $(date)"
  log_info ""

  # Check dependencies and credentials
  check_dependencies
  check_credentials

  # Create backup directory
  create_backup_dir

  # Create backup
  if ! create_backup; then
    exit 2
  fi

  # Encrypt backup (optional)
  encrypt_backup || true  # Don't fail if encryption is skipped

  # Verify backup
  if ! verify_backup; then
    exit 2
  fi

  # Cleanup old backups
  cleanup_old_backups

  # Generate report
  generate_backup_report

  log_info ""
  log_info "===== Backup Completed Successfully ====="
  log_info "Backup file: $([ -f "$BACKUP_FILE_ENC" ] && echo "$BACKUP_FILE_ENC" || echo "$BACKUP_FILE_GZ")"
  log_info ""

  exit 0
}

# Run main function
main "$@"
