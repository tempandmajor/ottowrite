# Load Testing Suite

Comprehensive load testing suite for Ottowrite using k6. Tests critical API endpoints and user journeys under various load scenarios to ensure production readiness.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Test Scenarios](#test-scenarios)
- [Performance Targets](#performance-targets)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Analyzing Results](#analyzing-results)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

```bash
# 1. Install k6
brew install k6  # macOS
# OR
sudo apt-get install k6  # Linux
# OR
choco install k6  # Windows

# 2. Configure environment
cp load-tests/.env.example load-tests/.env.local
# Edit .env.local with your test environment settings

# 3. Create test users
# Create 3 test users in your Supabase project with credentials matching .env.local

# 4. Run tests
npm run test:load              # All tests, normal scenario
npm run test:load:peak         # All tests, peak traffic (5x)
npm run test:load:spike        # All tests, launch spike
npm run test:load:projects     # Just projects API
npm run test:load:ai           # Just AI generation
npm run test:load:journey      # Complete user journey
```

## 📊 Test Scenarios

### 1. Normal Traffic (`normal`)
- **Users:** 10 concurrent
- **Duration:** 9 minutes
- **Purpose:** Baseline performance testing
- **Use:** Daily smoke tests, regression testing

### 2. Peak Traffic (`peak`)
- **Users:** 50 concurrent (5x normal)
- **Duration:** 9 minutes
- **Purpose:** Verify performance under expected peak load
- **Use:** Pre-launch testing, capacity planning

### 3. Launch Spike (`spike`)
- **Users:** 100 concurrent (sudden spike)
- **Duration:** 7 minutes
- **Purpose:** Test resilience during traffic spikes
- **Use:** Launch readiness, marketing campaign prep

### 4. Stress Test (`stress`)
- **Users:** Ramping up to 200
- **Duration:** 13 minutes
- **Purpose:** Find breaking points, identify bottlenecks
- **Use:** Capacity planning, infrastructure sizing

### 5. AI Load (`aiLoad`)
- **Users:** 5 concurrent
- **Duration:** 7 minutes
- **Purpose:** Test AI endpoint under sustained load
- **Use:** AI provider capacity testing, cost estimation

## 🎯 Performance Targets

| Endpoint Type | p50 | p95 | p99 | Error Rate |
|--------------|-----|-----|-----|------------|
| **API Endpoints** | <200ms | <500ms | <1s | <1% |
| **AI Generation** | <2s | <5s | <10s | <2% |
| **SSR Pages** | <500ms | <2s | <3s | <1% |

### Critical Endpoints

1. **Projects API** (`/api/projects`)
   - GET: List projects
   - POST: Create project
   - PATCH: Update project
   - DELETE: Delete project

2. **Documents API** (`/api/documents`)
   - GET: List documents
   - POST: Create document
   - PATCH: Update document

3. **AI Generation** (`/api/ai/generate`)
   - POST: Generate content

4. **Characters API** (`/api/characters`)
   - GET: List characters
   - POST: Create character

5. **Locations API** (`/api/locations`)
   - GET: List locations
   - POST: Create location

6. **Comments API** (`/api/comments`)
   - GET: List comments
   - POST: Create comment

7. **Dashboard** (`/dashboard`)
   - SSR page load performance

## 🔧 Setup

### Prerequisites

1. **k6** - Load testing tool
   ```bash
   # macOS
   brew install k6

   # Linux
   sudo apt-get install k6

   # Windows
   choco install k6

   # Docker
   docker pull grafana/k6
   ```

2. **Test Environment** - Staging or local development server
   - Must have valid Supabase connection
   - Should mirror production configuration
   - Should have test database (not production!)

3. **Test Users** - Create dedicated test accounts
   - Create 3 users in Supabase Auth
   - Use emails like `loadtest1@example.com`
   - Use strong passwords
   - **Never use real user accounts for load testing!**

### Environment Configuration

1. Copy environment template:
   ```bash
   cp load-tests/.env.example load-tests/.env.local
   ```

2. Edit `.env.local` with your settings:
   ```env
   BASE_URL=https://your-staging-url.vercel.app
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   TEST_USER_1_EMAIL=loadtest1@example.com
   TEST_USER_1_PASSWORD=YourSecurePassword123!
   # ... etc
   ```

3. Verify configuration:
   ```bash
   cat load-tests/.env.local
   ```

## 🏃 Running Tests

### Using npm Scripts

```bash
# Run all tests with normal scenario
npm run test:load

# Run all tests with peak traffic scenario
npm run test:load:peak

# Run all tests with spike scenario
npm run test:load:spike

# Run specific test
npm run test:load:projects
npm run test:load:ai
npm run test:load:journey
```

### Using Shell Script

```bash
# Run all tests (normal scenario)
./scripts/run-load-tests.sh

# Run specific test
./scripts/run-load-tests.sh projects-api

# Run with specific scenario
./scripts/run-load-tests.sh all peak
./scripts/run-load-tests.sh user-journey spike

# Available test names:
#   - projects-api
#   - ai-generate
#   - user-journey
```

### Using k6 Directly

```bash
# Basic run
k6 run load-tests/tests/projects-api.test.js

# With environment variables
k6 run \
  --env BASE_URL=https://your-app.com \
  --env NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  load-tests/tests/projects-api.test.js

# With specific scenario
k6 run \
  --env SCENARIO=peak \
  load-tests/tests/projects-api.test.js

# Output to file
k6 run \
  --out json=results.json \
  load-tests/tests/projects-api.test.js

# With k6 Cloud
k6 cloud load-tests/tests/projects-api.test.js
```

## 📈 Analyzing Results

### Reading k6 Output

k6 provides detailed metrics after each test:

```
✓ checks.........................: 98.50% ✓ 985      ✗ 15
✓ http_req_duration.............: avg=245ms  min=89ms med=201ms max=987ms p(95)=456ms p(99)=789ms
✓ http_req_failed...............: 0.50%  ✓ 5        ✗ 995
✓ http_reqs.....................: 1000   16.6/s
```

**Key Metrics:**

- **checks**: Percentage of successful validation checks
- **http_req_duration**: Response time distribution
  - `p(95)`: 95th percentile (target: <500ms for API)
  - `p(99)`: 99th percentile (target: <1s for API)
- **http_req_failed**: Error rate (target: <1%)
- **http_reqs**: Total requests and requests per second

### Report Files

Reports are saved to `load-tests/reports/` with timestamp:

```
load-tests/reports/
├── projects-api_20250124_143022.json       # Full metrics (JSON)
├── projects-api_20250124_143022_summary.txt # Summary stats
├── ai-generate_20250124_143530.json
└── user-journey_20250124_144015.json
```

### Custom Metrics

Each test includes custom metrics for specific operations:

**Projects API:**
- `project_list_success`: List operation success rate
- `project_create_success`: Create operation success rate
- `project_list_duration`: List operation response time
- `project_create_duration`: Create operation response time

**AI Generation:**
- `ai_generate_success`: AI generation success rate
- `ai_generate_duration`: AI generation response time
- `ai_generate_tokens`: Total tokens consumed
- `ai_generate_errors`: Total errors

**User Journey:**
- `dashboard_load_success`: Dashboard load success
- `complete_journey_duration`: Total time for full journey

### Identifying Bottlenecks

1. **Slow Response Times**
   - Check `http_req_duration` p95/p99
   - If >500ms for API: Optimize database queries or application logic
   - If >5s for AI: Check AI provider performance

2. **High Error Rates**
   - Check `http_req_failed`
   - If >1%: Investigate errors in application logs
   - Common causes: Rate limiting, database connection limits, timeouts

3. **Database Performance**
   ```sql
   -- Check slow queries in Supabase
   SELECT * FROM pg_stat_statements
   ORDER BY total_exec_time DESC
   LIMIT 10;
   ```

4. **Rate Limiting**
   - If hitting rate limits, check `lib/security/api-rate-limiter.ts`
   - Adjust limits for production or optimize request patterns

## 🔍 Troubleshooting

### Common Issues

**1. Authentication Failures**
```
✗ auth successful: 0/100 (0%)
```

**Solution:**
- Verify test user credentials in `.env.local`
- Ensure users exist in Supabase Auth
- Check Supabase URL and anon key are correct

**2. High Error Rates**
```
✗ http_req_failed: 15.50% ✓ 155 ✗ 845
```

**Solution:**
- Check application logs for errors
- Verify database connection pool size
- Check for rate limiting (429 errors)
- Ensure test environment has adequate resources

**3. Timeout Errors**
```
request timeout (default is 60s)
```

**Solution:**
- Increase timeout for slow endpoints (AI generation)
- Check network connectivity
- Verify server isn't overloaded

**4. Database Connection Errors**
```
remaining connection slots are reserved
```

**Solution:**
- Increase database connection pool size
- Reduce concurrent users
- Use connection pooling (Supabase does this by default)

**5. k6 Not Found**
```
bash: k6: command not found
```

**Solution:**
```bash
brew install k6  # macOS
# OR check installation instructions above
```

### Debug Mode

Run tests with verbose output:

```bash
k6 run --verbose load-tests/tests/projects-api.test.js
```

Enable console logs in tests:

```javascript
// Add to test file
import { check } from 'k6'

export default function() {
  console.log('Starting test iteration...')
  // ... test code
}
```

## 📚 Best Practices

### 1. Test Environment

- ✅ Use staging environment (mirrors production)
- ✅ Use dedicated test database
- ❌ **NEVER** run load tests against production
- ❌ **NEVER** use real user data

### 2. Test Users

- ✅ Create dedicated test accounts
- ✅ Use realistic data in tests
- ✅ Clean up test data after tests
- ❌ **NEVER** use real user credentials

### 3. Running Tests

- ✅ Start with normal scenario
- ✅ Gradually increase load (normal → peak → spike)
- ✅ Run tests during off-peak hours
- ✅ Monitor application logs during tests
- ❌ Don't run multiple heavy tests simultaneously

### 4. Analyzing Results

- ✅ Compare results over time (track regressions)
- ✅ Document bottlenecks and fixes
- ✅ Set performance budgets
- ✅ Re-test after optimizations

### 5. CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run Load Tests
  run: |
    npm run test:load
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    # ... other env vars
```

## 📖 Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Cloud](https://k6.io/cloud/)
- [Grafana k6 GitHub](https://github.com/grafana/k6)
- [Supabase Performance Tips](https://supabase.com/docs/guides/platform/performance)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)

## 🤝 Contributing

When adding new tests:

1. Create test file in `load-tests/tests/`
2. Follow naming convention: `feature-name.test.js`
3. Include setup and teardown functions
4. Add custom metrics for key operations
5. Document test in this README
6. Update npm scripts in `package.json`

## 📝 Notes

- All tests clean up data after execution
- Reports include timestamp for tracking
- Use `aiLoad` scenario for AI endpoints (lower concurrency)
- Monitor costs when testing AI endpoints (tokens are consumed)
- Database indexes are critical for performance - check `pg_stat_statements`
