#!/bin/bash

# Domain and SSL Verification Script
# Verifies domain configuration, DNS records, SSL certificates, and HTTPS setup
#
# Usage:
#   ./scripts/verify-domain-ssl.sh <domain>
#   ./scripts/verify-domain-ssl.sh ottowrite.app
#
# Exit codes:
#   0 - All checks passed
#   1 - Some checks failed

set -euo pipefail

# Domain to check (passed as argument)
DOMAIN="${1:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_failure() {
  echo -e "${RED}❌ $1${NC}"
}

log_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

run_test() {
  local test_name="$1"
  local test_command="$2"

  ((TESTS_RUN++))

  if eval "$test_command" > /dev/null 2>&1; then
    ((TESTS_PASSED++))
    log_success "$test_name"
    return 0
  else
    ((TESTS_FAILED++))
    log_failure "$test_name"
    return 1
  fi
}

# ============================================================================
# VALIDATION
# ============================================================================

validate_domain() {
  if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain>"
    echo "Example: $0 ottowrite.app"
    exit 1
  fi

  log_info "Domain: $DOMAIN"
  echo ""
}

check_dependencies() {
  local missing_deps=()

  if ! command -v dig &> /dev/null; then
    missing_deps+=("dig (dnsutils)")
  fi

  if ! command -v curl &> /dev/null; then
    missing_deps+=("curl")
  fi

  if ! command -v openssl &> /dev/null; then
    missing_deps+=("openssl")
  fi

  if [ ${#missing_deps[@]} -ne 0 ]; then
    log_failure "Missing required dependencies:"
    for dep in "${missing_deps[@]}"; do
      echo "  - $dep"
    done
    exit 1
  fi
}

# ============================================================================
# DNS TESTS
# ============================================================================

test_dns_a_record() {
  log_info "Testing DNS A record..."

  local ip=$(dig +short "$DOMAIN" A | head -1)

  if [ -n "$ip" ]; then
    log_success "DNS A record: $ip"
    return 0
  else
    log_failure "DNS A record: Not found"
    return 1
  fi
}

test_dns_cname_record() {
  log_info "Testing DNS CNAME record for www..."

  local cname=$(dig +short "www.$DOMAIN" CNAME | head -1)

  if [ -n "$cname" ]; then
    log_success "DNS CNAME record: www.$DOMAIN → $cname"
    return 0
  else
    log_warn "DNS CNAME record: Not configured (optional)"
    return 0  # Not critical
  fi
}

test_dns_propagation() {
  log_info "Testing DNS propagation..."

  # Check if domain resolves
  if dig +short "$DOMAIN" A | grep -q "."; then
    log_success "DNS propagation: Complete"
    return 0
  else
    log_failure "DNS propagation: Still propagating or not configured"
    return 1
  fi
}

# ============================================================================
# SSL/TLS TESTS
# ============================================================================

test_https_accessible() {
  log_info "Testing HTTPS accessibility..."

  local status=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" --max-time 10 || echo "000")

  if [ "$status" = "200" ]; then
    log_success "HTTPS accessible: 200 OK"
    return 0
  elif [ "$status" = "301" ] || [ "$status" = "302" ] || [ "$status" = "308" ]; then
    log_success "HTTPS accessible: $status (redirect)"
    return 0
  else
    log_failure "HTTPS accessible: $status"
    return 1
  fi
}

test_http_redirect() {
  log_info "Testing HTTP → HTTPS redirect..."

  local location=$(curl -s -I "http://$DOMAIN" --max-time 10 | grep -i "^location:" | awk '{print $2}' | tr -d '\r')

  if [[ "$location" == https://* ]]; then
    log_success "HTTP → HTTPS redirect: Working"
    return 0
  else
    log_failure "HTTP → HTTPS redirect: Not configured (got: $location)"
    return 1
  fi
}

test_ssl_certificate() {
  log_info "Testing SSL certificate..."

  # Get certificate details
  local cert_info=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

  if [ -n "$cert_info" ]; then
    local expiry=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
    log_success "SSL certificate: Valid (expires: $expiry)"
    return 0
  else
    log_failure "SSL certificate: Not found or invalid"
    return 1
  fi
}

test_ssl_issuer() {
  log_info "Testing SSL certificate issuer..."

  local issuer=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | \
    openssl x509 -noout -issuer 2>/dev/null | cut -d= -f2- || echo "Unknown")

  if [[ "$issuer" == *"Let's Encrypt"* ]] || [[ "$issuer" == *"Vercel"* ]]; then
    log_success "SSL issuer: $issuer"
    return 0
  else
    log_warn "SSL issuer: $issuer (expected Let's Encrypt or Vercel)"
    return 0  # Not critical
  fi
}

test_tls_version() {
  log_info "Testing TLS version..."

  # Test if TLS 1.2 or higher is supported
  if openssl s_client -connect "$DOMAIN:443" -tls1_2 -servername "$DOMAIN" < /dev/null 2>&1 | grep -q "Cipher"; then
    log_success "TLS version: TLS 1.2+ supported"
    return 0
  else
    log_failure "TLS version: TLS 1.2+ not supported"
    return 1
  fi
}

# ============================================================================
# REDIRECT TESTS
# ============================================================================

test_www_redirect() {
  log_info "Testing www → non-www redirect..."

  local location=$(curl -s -I "https://www.$DOMAIN" --max-time 10 | grep -i "^location:" | awk '{print $2}' | tr -d '\r')

  if [[ "$location" == "https://$DOMAIN/"* ]] || [[ "$location" == "https://$DOMAIN" ]]; then
    log_success "www redirect: Working (www.$DOMAIN → $DOMAIN)"
    return 0
  elif [ -z "$location" ]; then
    log_warn "www redirect: No redirect (www.$DOMAIN serves directly)"
    return 0  # Not critical
  else
    log_warn "www redirect: Unexpected redirect to $location"
    return 0  # Not critical
  fi
}

# ============================================================================
# SECURITY TESTS
# ============================================================================

test_hsts_header() {
  log_info "Testing HSTS header..."

  local hsts=$(curl -s -I "https://$DOMAIN" --max-time 10 | grep -i "^strict-transport-security:" | cut -d: -f2- | tr -d '\r' | xargs)

  if [ -n "$hsts" ]; then
    log_success "HSTS header: Enabled ($hsts)"
    return 0
  else
    log_warn "HSTS header: Not set (recommended for security)"
    return 0  # Not critical
  fi
}

test_security_headers() {
  log_info "Testing security headers..."

  local headers=$(curl -s -I "https://$DOMAIN" --max-time 10)

  local found_headers=()
  local missing_headers=()

  # Check for common security headers
  if echo "$headers" | grep -qi "X-Frame-Options:"; then
    found_headers+=("X-Frame-Options")
  else
    missing_headers+=("X-Frame-Options")
  fi

  if echo "$headers" | grep -qi "X-Content-Type-Options:"; then
    found_headers+=("X-Content-Type-Options")
  else
    missing_headers+=("X-Content-Type-Options")
  fi

  if [ ${#found_headers[@]} -gt 0 ]; then
    log_success "Security headers: ${#found_headers[@]} found (${found_headers[*]})"
  fi

  if [ ${#missing_headers[@]} -gt 0 ]; then
    log_warn "Security headers: ${#missing_headers[@]} missing (${missing_headers[*]})"
  fi

  return 0  # Not critical
}

# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

test_response_time() {
  log_info "Testing response time..."

  local time=$(curl -o /dev/null -s -w '%{time_total}' "https://$DOMAIN" --max-time 10)
  local time_ms=$(echo "$time * 1000" | bc | cut -d. -f1)

  if [ "$time_ms" -lt 1000 ]; then
    log_success "Response time: ${time_ms}ms (excellent)"
  elif [ "$time_ms" -lt 3000 ]; then
    log_success "Response time: ${time_ms}ms (good)"
  else
    log_warn "Response time: ${time_ms}ms (slow, target < 3000ms)"
  fi

  return 0  # Not critical
}

# ============================================================================
# APPLICATION TESTS
# ============================================================================

test_robots_txt() {
  log_info "Testing robots.txt..."

  local status=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/robots.txt" --max-time 10)

  if [ "$status" = "200" ]; then
    log_success "robots.txt: Found"
    return 0
  else
    log_warn "robots.txt: Not found ($status)"
    return 0  # Not critical
  fi
}

test_sitemap() {
  log_info "Testing sitemap.xml..."

  local status=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/sitemap.xml" --max-time 10)

  if [ "$status" = "200" ]; then
    log_success "sitemap.xml: Found"
    return 0
  else
    log_warn "sitemap.xml: Not found ($status)"
    return 0  # Not critical
  fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  echo ""
  log_info "===== Domain & SSL Verification ====="
  log_info "Testing: $DOMAIN"
  echo ""

  # Validate inputs
  validate_domain
  check_dependencies

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "DNS TESTS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  test_dns_a_record
  test_dns_cname_record
  test_dns_propagation
  echo ""

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SSL/TLS TESTS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  test_https_accessible
  test_http_redirect
  test_ssl_certificate
  test_ssl_issuer
  test_tls_version
  echo ""

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "REDIRECT TESTS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  test_www_redirect
  echo ""

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SECURITY TESTS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  test_hsts_header
  test_security_headers
  echo ""

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "PERFORMANCE TESTS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  test_response_time
  echo ""

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "APPLICATION TESTS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  test_robots_txt
  test_sitemap
  echo ""

  # Summary
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SUMMARY"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Domain: $DOMAIN"
  echo "Tests Run: $TESTS_RUN"
  log_success "Tests Passed: $TESTS_PASSED"

  if [ $TESTS_FAILED -gt 0 ]; then
    log_failure "Tests Failed: $TESTS_FAILED"
    echo ""
    log_failure "Some tests failed. Please review the output above."
    echo ""
    log_info "Recommendations:"
    echo "  1. Check DNS configuration in your domain registrar"
    echo "  2. Verify Vercel domain settings"
    echo "  3. Wait for DNS propagation (up to 48 hours)"
    echo "  4. Check SSL certificate status in Vercel dashboard"
    echo ""
    exit 1
  else
    echo ""
    log_success "All critical tests passed! ✅"
    echo ""
    log_info "Additional Recommendations:"
    echo "  1. Test on SSL Labs: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    echo "  2. Check security headers: https://securityheaders.com/?q=$DOMAIN"
    echo "  3. Run Lighthouse audit: https://web.dev/measure/"
    echo "  4. Monitor uptime: Set up status monitoring (UptimeRobot, Pingdom, etc.)"
    echo ""
    exit 0
  fi
}

# Run main function
main "$@"
