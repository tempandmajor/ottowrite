#!/bin/bash

# Database Restore Script for Ottowrite
# Restores a Supabase PostgreSQL database from backup
#
# Usage:
#   ./scripts/restore-database.sh <backup_file>
#   ./scripts/restore-database.sh backups/daily/ottowrite_daily_20251024_120000.sql.gz
#
# Requirements:
#   - PostgreSQL client tools (psql)
#   - gzip (for compressed backups)
#   - openssl (for encrypted backups)
#   - Environment variables set (.env.local)
#
# WARNING: This will REPLACE all data in the target database!
#
# Exit codes:
#   0 - Success
#   1 - Missing dependencies or invalid arguments
#   2 - Restore failed

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

# Backup file to restore (passed as argument)
BACKUP_FILE="${1:-}"

# Project details
PROJECT_REF="${SUPABASE_PROJECT_REF:-jtngociduoicfnieidxf}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

# Temp directory for restore
TEMP_DIR="/tmp/supabase_restore_$$"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
  echo -e "${BLUE}[STEP]${NC} $1"
}

cleanup() {
  if [ -d "$TEMP_DIR" ]; then
    log_info "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
  fi
}

# Cleanup on exit
trap cleanup EXIT

check_dependencies() {
  log_info "Checking dependencies..."

  local missing_deps=()

  if ! command -v psql &> /dev/null; then
    missing_deps+=("psql (PostgreSQL client)")
  fi

  if ! command -v gzip &> /dev/null; then
    missing_deps+=("gzip")
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
    exit 1
  fi

  log_info "Credentials found"
}

validate_backup_file() {
  log_info "Validating backup file..."

  if [ -z "$BACKUP_FILE" ]; then
    log_error "No backup file specified"
    echo ""
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 backups/daily/ottowrite_daily_20251024_120000.sql.gz"
    exit 1
  fi

  if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
  fi

  log_info "Backup file: $BACKUP_FILE"
  log_info "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
}

confirm_restore() {
  log_warn "⚠️  WARNING: This will REPLACE ALL DATA in the database!"
  log_warn "Database: postgres@db.${PROJECT_REF}.supabase.co"
  log_warn "Backup: $BACKUP_FILE"
  echo ""

  read -p "Are you sure you want to continue? (Type 'YES' to confirm): " confirm

  if [ "$confirm" != "YES" ]; then
    log_info "Restore cancelled by user"
    exit 0
  fi

  log_info "Restore confirmed"
}

prepare_backup_file() {
  log_step "Preparing backup file..."

  mkdir -p "$TEMP_DIR"

  local SQL_FILE="$TEMP_DIR/restore.sql"

  # Check if file is encrypted
  if [[ "$BACKUP_FILE" == *.enc ]]; then
    log_info "Backup is encrypted, decrypting..."

    if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
      log_error "BACKUP_ENCRYPTION_KEY not set. Cannot decrypt backup."
      exit 1
    fi

    # Decrypt to temp file
    local DECRYPTED_FILE="$TEMP_DIR/backup.sql.gz"

    if ! openssl enc -aes-256-cbc -d \
      -in "$BACKUP_FILE" \
      -out "$DECRYPTED_FILE" \
      -k "$BACKUP_ENCRYPTION_KEY"; then

      log_error "Decryption failed"
      exit 2
    fi

    BACKUP_FILE="$DECRYPTED_FILE"
  fi

  # Check if file is compressed
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    log_info "Decompressing backup..."

    if ! gzip -dc "$BACKUP_FILE" > "$SQL_FILE"; then
      log_error "Decompression failed"
      exit 2
    fi
  else
    # Copy uncompressed file
    cp "$BACKUP_FILE" "$SQL_FILE"
  fi

  # Verify SQL file
  if [ ! -f "$SQL_FILE" ] || [ ! -s "$SQL_FILE" ]; then
    log_error "Failed to prepare SQL file"
    exit 2
  fi

  local SQL_SIZE=$(du -h "$SQL_FILE" | cut -f1)
  log_info "SQL file prepared: $SQL_SIZE"

  echo "$SQL_FILE"
}

create_pre_restore_snapshot() {
  log_step "Creating pre-restore snapshot..."

  local SNAPSHOT_DIR="./backups/pre-restore"
  mkdir -p "$SNAPSHOT_DIR"

  local SNAPSHOT_FILE="${SNAPSHOT_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"

  log_info "Snapshot file: $SNAPSHOT_FILE"

  # Database connection details
  local DB_HOST="db.${PROJECT_REF}.supabase.co"
  local DB_PORT="5432"
  local DB_NAME="postgres"
  local DB_USER="postgres"

  export PGPASSWORD="$DB_PASSWORD"

  if pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl \
    --file=- 2>/dev/null | gzip -9 > "$SNAPSHOT_FILE"; then

    log_info "Pre-restore snapshot created successfully"
    log_info "Snapshot size: $(du -h "$SNAPSHOT_FILE" | cut -f1)"
  else
    log_warn "Failed to create pre-restore snapshot (continuing anyway)"
  fi

  unset PGPASSWORD
}

restore_database() {
  local SQL_FILE="$1"

  log_step "Restoring database..."

  # Database connection details
  local DB_HOST="db.${PROJECT_REF}.supabase.co"
  local DB_PORT="5432"
  local DB_NAME="postgres"
  local DB_USER="postgres"

  export PGPASSWORD="$DB_PASSWORD"

  log_info "Connecting to: $DB_HOST"
  log_info "This may take several minutes..."

  if psql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --file="$SQL_FILE" \
    --single-transaction \
    --set ON_ERROR_STOP=on \
    --quiet \
    2>&1 | grep -v "^psql:.*NOTICE"; then

    log_info "Database restored successfully"
    unset PGPASSWORD
    return 0
  else
    log_error "Database restore failed"
    unset PGPASSWORD
    return 2
  fi
}

verify_restore() {
  log_step "Verifying restore..."

  # Database connection details
  local DB_HOST="db.${PROJECT_REF}.supabase.co"
  local DB_PORT="5432"
  local DB_NAME="postgres"
  local DB_USER="postgres"

  export PGPASSWORD="$DB_PASSWORD"

  # Run basic verification queries
  log_info "Checking table counts..."

  local TABLE_COUNT=$(psql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --tuples-only \
    --no-align \
    --command="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
    2>/dev/null || echo "0")

  log_info "Tables in public schema: $TABLE_COUNT"

  if [ "$TABLE_COUNT" -gt 0 ]; then
    log_info "Restore verification passed"
  else
    log_warn "No tables found in public schema"
  fi

  unset PGPASSWORD
}

generate_restore_report() {
  log_step "Generating restore report..."

  local REPORT_FILE="./backups/restore_report_$(date +%Y%m%d_%H%M%S).txt"

  cat > "$REPORT_FILE" <<EOF
Ottowrite Database Restore Report
Generated: $(date)

Restore Details:
- Backup File: $BACKUP_FILE
- Target Database: postgres@db.${PROJECT_REF}.supabase.co
- Region: us-east-1

Status: ✅ Restore completed successfully

Next Steps:
1. Verify application functionality
2. Check data integrity
3. Test critical features
4. Monitor error logs

Pre-Restore Snapshot:
- Location: ./backups/pre-restore/
- Use if rollback is needed
EOF

  log_info "Report saved to: $REPORT_FILE"
  cat "$REPORT_FILE"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  log_info "===== Ottowrite Database Restore ====="
  log_info "Date: $(date)"
  log_info ""

  # Check dependencies and credentials
  check_dependencies
  check_credentials

  # Validate backup file
  validate_backup_file

  # Confirm restore
  confirm_restore

  # Create pre-restore snapshot
  create_pre_restore_snapshot

  # Prepare backup file
  local SQL_FILE=$(prepare_backup_file)

  # Restore database
  if ! restore_database "$SQL_FILE"; then
    log_error "Restore failed!"
    log_info "Pre-restore snapshot available in: ./backups/pre-restore/"
    exit 2
  fi

  # Verify restore
  verify_restore

  # Generate report
  generate_restore_report

  log_info ""
  log_info "===== Restore Completed Successfully ====="
  log_info ""
  log_warn "⚠️  IMPORTANT: Please verify the following:"
  log_warn "1. Check application functionality"
  log_warn "2. Verify data integrity"
  log_warn "3. Test critical features"
  log_warn "4. Review error logs"
  log_info ""

  exit 0
}

# Run main function
main "$@"
