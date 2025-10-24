#!/bin/bash
#
# Load Test Runner Script
#
# Runs all load tests and generates comprehensive reports.
# Usage:
#   ./scripts/run-load-tests.sh [test-name] [scenario]
#
# Examples:
#   ./scripts/run-load-tests.sh                    # Run all tests with normal scenario
#   ./scripts/run-load-tests.sh projects-api       # Run specific test
#   ./scripts/run-load-tests.sh all peak           # Run all tests with peak scenario
#   ./scripts/run-load-tests.sh user-journey stress # Run user journey stress test

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOAD_TESTS_DIR="load-tests"
REPORTS_DIR="load-tests/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Parse arguments
TEST_NAME="${1:-all}"
SCENARIO="${2:-normal}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Ottowrite Load Testing Suite${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}✗ k6 is not installed${NC}"
    echo ""
    echo "Install k6:"
    echo "  macOS:   brew install k6"
    echo "  Linux:   sudo apt-get install k6"
    echo "  Windows: choco install k6"
    echo "  Docker:  docker pull grafana/k6"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ k6 installed:${NC} $(k6 version)"
echo ""

# Check if .env.local exists
if [ ! -f "$LOAD_TESTS_DIR/.env.local" ]; then
    echo -e "${YELLOW}⚠ Warning: .env.local not found${NC}"
    echo "Copy .env.example to .env.local and configure it:"
    echo "  cp $LOAD_TESTS_DIR/.env.example $LOAD_TESTS_DIR/.env.local"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Load environment variables
if [ -f "$LOAD_TESTS_DIR/.env.local" ]; then
    echo -e "${BLUE}ℹ Loading environment variables...${NC}"
    export $(grep -v '^#' "$LOAD_TESTS_DIR/.env.local" | xargs)
fi

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Function to run a single test
run_test() {
    local test_file=$1
    local test_name=$(basename "$test_file" .test.js)
    local report_file="$REPORTS_DIR/${test_name}_${TIMESTAMP}.json"
    local summary_file="$REPORTS_DIR/${test_name}_${TIMESTAMP}_summary.txt"

    echo ""
    echo -e "${BLUE}━━━ Running: ${test_name} (${SCENARIO} scenario) ━━━${NC}"
    echo ""

    # Run k6 test
    if k6 run \
        --out json="$report_file" \
        --summary-export="$summary_file" \
        --env SCENARIO="$SCENARIO" \
        "$test_file"; then
        echo ""
        echo -e "${GREEN}✓ Test completed: ${test_name}${NC}"
        echo -e "${BLUE}  Report: ${report_file}${NC}"
        echo -e "${BLUE}  Summary: ${summary_file}${NC}"
        return 0
    else
        echo ""
        echo -e "${RED}✗ Test failed: ${test_name}${NC}"
        return 1
    fi
}

# Function to run all tests
run_all_tests() {
    local failed_tests=()
    local passed_tests=()

    # Find all test files
    local test_files=($(find "$LOAD_TESTS_DIR/tests" -name "*.test.js" | sort))

    if [ ${#test_files[@]} -eq 0 ]; then
        echo -e "${RED}✗ No test files found in $LOAD_TESTS_DIR/tests${NC}"
        exit 1
    fi

    echo -e "${BLUE}Found ${#test_files[@]} test(s) to run${NC}"
    echo ""

    # Run each test
    for test_file in "${test_files[@]}"; do
        if run_test "$test_file"; then
            passed_tests+=("$(basename "$test_file" .test.js)")
        else
            failed_tests+=("$(basename "$test_file" .test.js)")
        fi
    done

    # Print summary
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}   Test Run Summary${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}Passed: ${#passed_tests[@]}${NC}"
    for test in "${passed_tests[@]}"; do
        echo -e "  ${GREEN}✓${NC} $test"
    done
    echo ""

    if [ ${#failed_tests[@]} -gt 0 ]; then
        echo -e "${RED}Failed: ${#failed_tests[@]}${NC}"
        for test in "${failed_tests[@]}"; do
            echo -e "  ${RED}✗${NC} $test"
        done
        echo ""
        exit 1
    fi

    echo -e "${GREEN}All tests passed!${NC}"
    echo ""
}

# Main execution
if [ "$TEST_NAME" = "all" ]; then
    run_all_tests
else
    # Run specific test
    test_file="$LOAD_TESTS_DIR/tests/${TEST_NAME}.test.js"

    if [ ! -f "$test_file" ]; then
        echo -e "${RED}✗ Test not found: $test_file${NC}"
        echo ""
        echo "Available tests:"
        find "$LOAD_TESTS_DIR/tests" -name "*.test.js" -exec basename {} .test.js \;
        exit 1
    fi

    run_test "$test_file"
fi

# Print next steps
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Next Steps${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. Review test results in: $REPORTS_DIR"
echo "2. Analyze performance metrics"
echo "3. Identify bottlenecks using Supabase Query Analyzer"
echo "4. Optimize slow endpoints"
echo "5. Re-run tests to verify improvements"
echo ""
echo "Generate HTML report (if k6-reporter installed):"
echo "  k6-reporter $REPORTS_DIR/*_${TIMESTAMP}.json"
echo ""
echo "View in k6 Cloud (if configured):"
echo "  k6 cloud upload $REPORTS_DIR/*_${TIMESTAMP}.json"
echo ""
