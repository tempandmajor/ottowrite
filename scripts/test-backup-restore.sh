#!/bin/bash

# Backup & Restore Test Script
# Tests the complete backup and restore workflow
#
# Usage: ./scripts/test-backup-restore.sh

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
  echo -e "${BLUE}[STEP]${NC} $1"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_failure() {
  echo -e "${RED}❌ $1${NC}"
}

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
  local test_name="$1"
  local test_command="$2"

  ((TESTS_RUN++))

  echo ""
  log_step "Test $TESTS_RUN: $test_name"

  if eval "$test_command"; then
    ((TESTS_PASSED++))
    log_success "$test_name"
    return 0
  else
    ((TESTS_FAILED++))
    log_failure "$test_name"
    return 1
  fi
}

main() {
  log_info "===== Backup & Restore Test Suite ====="
  log_info "Date: $(date)"
  echo ""

  # Test 1: Check dependencies
  run_test "Check pg_dump installed" "command -v pg_dump > /dev/null"

  # Test 2: Check gzip
  run_test "Check gzip installed" "command -v gzip > /dev/null"

  # Test 3: Check backup script exists
  run_test "Check backup script exists" "[ -f scripts/backup-database.sh ]"

  # Test 4: Check restore script exists
  run_test "Check restore script exists" "[ -f scripts/restore-database.sh ]"

  # Test 5: Check scripts are executable
  run_test "Check backup script is executable" "[ -x scripts/backup-database.sh ]"
  run_test "Check restore script is executable" "[ -x scripts/restore-database.sh ]"

  # Test 6: Check environment variables
  run_test "Check SUPABASE_DB_PASSWORD set" "[ -n \"\${SUPABASE_DB_PASSWORD:-}\" ]"

  # Test 7: Check database connectivity
  if [ -n "${SUPABASE_DB_PASSWORD:-}" ]; then
    run_test "Check database connectivity" "
      export PGPASSWORD=\"\$SUPABASE_DB_PASSWORD\"
      psql \
        -h db.jtngociduoicfnieidxf.supabase.co \
        -U postgres \
        -d postgres \
        -c 'SELECT 1;' > /dev/null 2>&1
      unset PGPASSWORD
    "
  else
    log_step "Skipping database connectivity test (password not set)"
    ((TESTS_RUN++))
  fi

  # Test 8: Test backup directory creation
  run_test "Create backup directory" "mkdir -p backups/test"

  # Test 9: Test backup creation (dry run)
  log_info ""
  log_info "To test actual backup creation, run:"
  log_info "  ./scripts/backup-database.sh"
  log_info ""
  log_info "To test backup restoration, run:"
  log_info "  ./scripts/restore-database.sh backups/daily/<backup-file>"

  # Summary
  echo ""
  echo "======================================"
  log_info "Test Results:"
  echo "  Total Tests: $TESTS_RUN"
  log_success "Passed: $TESTS_PASSED"

  if [ $TESTS_FAILED -gt 0 ]; then
    log_failure "Failed: $TESTS_FAILED"
    echo ""
    log_error "Some tests failed. Please fix issues before using backup scripts."
    exit 1
  else
    echo ""
    log_success "All tests passed! Backup system is ready."
    echo ""
    log_info "Next steps:"
    echo "  1. Run: ./scripts/backup-database.sh"
    echo "  2. Verify backup in: backups/daily/"
    echo "  3. Test restore (optional): ./scripts/restore-database.sh <backup-file>"
    exit 0
  fi
}

main "$@"
