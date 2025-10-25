#!/bin/bash
# ============================================================================
# Migration Linter
# ============================================================================
# Checks database migrations for common issues and best practices violations
#
# Usage:
#   ./scripts/lint-migrations.sh [migration-file]
#
# Examples:
#   ./scripts/lint-migrations.sh                                  # Lint all migrations
#   ./scripts/lint-migrations.sh supabase/migrations/12345*.sql   # Lint specific migration
#
# Exit codes:
#   0 - All checks passed
#   1 - Critical issues found
#   2 - Warnings found (non-blocking)
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
FILES_CHECKED=0

# Configuration
MIGRATIONS_DIR="supabase/migrations"
MAX_FILE_SIZE=200  # Maximum lines before suggesting split
REQUIRED_SECTIONS=(
  "Migration:"
  "Description:"
  "Rollback:"
)

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Migration Linter${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_file_header() {
  local file=$1
  echo -e "${BLUE}Checking:${NC} $(basename "$file")"
}

print_error() {
  local file=$1
  local message=$2
  echo -e "  ${RED}❌ ERROR:${NC} $message"
  ((ERRORS++))
}

print_warning() {
  local file=$1
  local message=$2
  echo -e "  ${YELLOW}⚠️  WARNING:${NC} $message"
  ((WARNINGS++))
}

print_info() {
  local message=$1
  echo -e "  ${BLUE}ℹ️  INFO:${NC} $message"
}

print_success() {
  local message=$1
  echo -e "  ${GREEN}✓${NC} $message"
}

# ============================================================================
# Lint Checks
# ============================================================================

check_migration_header() {
  local file=$1
  local has_header=false

  for section in "${REQUIRED_SECTIONS[@]}"; do
    if ! grep -q "^-- $section" "$file"; then
      print_error "$file" "Missing required header section: '$section'"
    else
      has_header=true
    fi
  done

  if [ "$has_header" = true ]; then
    print_success "Has migration header with required sections"
  fi
}

check_file_size() {
  local file=$1
  local lines=$(wc -l < "$file" | tr -d ' ')

  if [ "$lines" -gt "$MAX_FILE_SIZE" ]; then
    print_warning "$file" "Large migration ($lines lines) - consider splitting (recommended: <$MAX_FILE_SIZE lines)"
  else
    print_success "File size reasonable ($lines lines)"
  fi
}

check_validation_blocks() {
  local file=$1
  local has_preflight=false
  local has_postflight=false

  if grep -q "PRE-FLIGHT CHECK" "$file" || grep -q "Pre-flight check" "$file"; then
    has_preflight=true
  fi

  if grep -q "POST-MIGRATION VALIDATION" "$file" || grep -q "Post-migration validation" "$file"; then
    has_postflight=true
  fi

  if [ "$has_preflight" = false ]; then
    print_warning "$file" "No pre-flight checks found (recommended for safety)"
  else
    print_success "Has pre-flight checks"
  fi

  if [ "$has_postflight" = false ]; then
    print_warning "$file" "No post-migration validation found (recommended for verification)"
  else
    print_success "Has post-migration validation"
  fi
}

check_rollback_instructions() {
  local file=$1

  if grep -q "ROLLBACK" "$file" || grep -q "Rollback:" "$file"; then
    print_success "Has rollback instructions"
  else
    print_error "$file" "Missing rollback instructions"
  fi
}

check_dangerous_operations() {
  local file=$1
  local has_dangerous=false

  # Check for DROP TABLE without CASCADE documentation
  if grep -i "DROP TABLE" "$file" | grep -qv "CASCADE"; then
    if ! grep -q "CASCADE" "$file"; then
      print_warning "$file" "DROP TABLE without CASCADE - ensure no dependent objects"
      has_dangerous=true
    fi
  fi

  # Check for ALTER TABLE DROP COLUMN
  if grep -i "ALTER TABLE.*DROP COLUMN" "$file"; then
    print_warning "$file" "DROP COLUMN detected - ensure data is backed up/migrated"
    has_dangerous=true
  fi

  # Check for TRUNCATE
  if grep -i "TRUNCATE" "$file"; then
    print_warning "$file" "TRUNCATE detected - this deletes all data!"
    has_dangerous=true
  fi

  # Check for DELETE without WHERE
  if grep -i "^DELETE FROM" "$file" | grep -qv "WHERE"; then
    print_error "$file" "DELETE without WHERE clause - will delete all rows!"
    has_dangerous=true
  fi

  if [ "$has_dangerous" = false ]; then
    print_success "No dangerous operations detected"
  fi
}

check_concurrent_indexes() {
  local file=$1
  local has_non_concurrent=false

  # Check for CREATE INDEX without CONCURRENTLY
  if grep -i "CREATE INDEX" "$file" | grep -qv "CONCURRENTLY"; then
    print_warning "$file" "CREATE INDEX without CONCURRENTLY - may cause downtime on large tables"
    has_non_concurrent=true
  fi

  # Check for DROP INDEX without CONCURRENTLY
  if grep -i "DROP INDEX" "$file" | grep -qv "CONCURRENTLY"; then
    print_warning "$file" "DROP INDEX without CONCURRENTLY - may cause downtime"
    has_non_concurrent=true
  fi

  if grep -i "CREATE INDEX CONCURRENTLY" "$file"; then
    print_success "Uses CONCURRENTLY for index operations"
  fi
}

check_idempotency() {
  local file=$1
  local has_if_not_exists=false

  # Check for IF NOT EXISTS / IF EXISTS
  if grep -qi "IF NOT EXISTS" "$file" || grep -qi "IF EXISTS" "$file"; then
    has_if_not_exists=true
    print_success "Uses IF NOT EXISTS / IF EXISTS for idempotency"
  else
    print_info "No IF NOT EXISTS / IF EXISTS found (may not be applicable)"
  fi
}

check_hardcoded_values() {
  local file=$1

  # Check for hardcoded UUIDs (pattern: 8-4-4-4-12 hex chars)
  if grep -E "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" "$file" | grep -v "uuid_generate_v4()"; then
    print_warning "$file" "Hardcoded UUIDs detected - use uuid_generate_v4() instead"
  fi

  # Check for auth.uid() usage (good!)
  if grep -q "auth.uid()" "$file"; then
    print_success "Uses auth.uid() for user references"
  fi
}

check_rls_policies() {
  local file=$1

  # Check if table is created without RLS
  if grep -i "CREATE TABLE" "$file"; then
    if ! grep -q "ENABLE ROW LEVEL SECURITY" "$file"; then
      print_warning "$file" "Table created without enabling RLS - ensure this is intentional"
    else
      print_success "RLS enabled on new tables"
    fi

    # Check if RLS policy exists
    if ! grep -q "CREATE POLICY" "$file"; then
      print_warning "$file" "No RLS policies found for new table - ensure this is intentional"
    else
      print_success "Has RLS policies"
    fi
  fi
}

check_transaction_safety() {
  local file=$1

  # Check for CONCURRENTLY inside DO block (not allowed)
  if grep -q "DO \$\$" "$file" && grep -i "CONCURRENTLY" "$file"; then
    print_error "$file" "CONCURRENTLY cannot be used inside DO blocks or transactions"
  fi
}

check_naming_conventions() {
  local file=$1
  local filename=$(basename "$file")

  # Check filename format: YYYYMMDDHHMMSS_description.sql
  if ! echo "$filename" | grep -qE "^[0-9]{14}_[a-z_]+\.sql$"; then
    print_warning "$file" "Filename doesn't follow naming convention: YYYYMMDDHHMMSS_action_target.sql"
  else
    print_success "Filename follows naming convention"
  fi

  # Check for descriptive name (not generic)
  if echo "$filename" | grep -qiE "_update|_fix|_misc|_temp|_test"; then
    print_warning "$file" "Filename is not descriptive - use specific action/target"
  fi
}

# ============================================================================
# Main Linting Function
# ============================================================================

lint_migration() {
  local file=$1

  ((FILES_CHECKED++))
  print_file_header "$file"

  # Skip template file
  if [[ "$file" == *".template.sql" ]]; then
    print_info "Skipping template file"
    echo ""
    return 0
  fi

  # Run all checks
  check_naming_conventions "$file"
  check_migration_header "$file"
  check_file_size "$file"
  check_validation_blocks "$file"
  check_rollback_instructions "$file"
  check_dangerous_operations "$file"
  check_concurrent_indexes "$file"
  check_idempotency "$file"
  check_hardcoded_values "$file"
  check_rls_policies "$file"
  check_transaction_safety "$file"

  echo ""
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
  print_header

  # Determine which files to check
  if [ $# -eq 0 ]; then
    # No arguments: check all migrations
    echo "Linting all migrations in $MIGRATIONS_DIR/"
    echo ""

    if [ ! -d "$MIGRATIONS_DIR" ]; then
      echo -e "${RED}Error: Migrations directory not found: $MIGRATIONS_DIR${NC}"
      exit 1
    fi

    for file in "$MIGRATIONS_DIR"/*.sql; do
      if [ -f "$file" ]; then
        lint_migration "$file"
      fi
    done
  else
    # Lint specified files
    for file in "$@"; do
      if [ -f "$file" ]; then
        lint_migration "$file"
      else
        echo -e "${RED}Error: File not found: $file${NC}"
        exit 1
      fi
    done
  fi

  # Print summary
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Summary${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  Files checked: $FILES_CHECKED"

  if [ $ERRORS -gt 0 ]; then
    echo -e "  ${RED}Errors: $ERRORS${NC}"
  else
    echo -e "  ${GREEN}Errors: 0${NC}"
  fi

  if [ $WARNINGS -gt 0 ]; then
    echo -e "  ${YELLOW}Warnings: $WARNINGS${NC}"
  else
    echo -e "  ${GREEN}Warnings: 0${NC}"
  fi

  echo ""

  # Exit with appropriate code
  if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Linting failed with $ERRORS critical issues${NC}"
    exit 1
  elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Linting passed with $WARNINGS warnings${NC}"
    exit 0  # Warnings are non-blocking
  else
    echo -e "${GREEN}✅ All checks passed!${NC}"
    exit 0
  fi
}

# Run main function
main "$@"
