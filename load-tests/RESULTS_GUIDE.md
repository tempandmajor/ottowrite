# Load Test Results Interpretation Guide

Quick reference guide for analyzing load test results and identifying performance issues.

## 📊 Understanding k6 Metrics

### Key Metrics Explained

```
✓ checks.........................: 98.50% ✓ 985      ✗ 15
✓ http_req_duration.............: avg=245ms  min=89ms med=201ms max=987ms p(95)=456ms p(99)=789ms
✓ http_req_failed...............: 0.50%  ✓ 5        ✗ 995
  http_reqs.....................: 1000   16.6/s
  iterations....................: 100    1.66/s
  vus...........................: 10     min=10     max=10
  vus_max.......................: 10     min=10     max=10
```

#### **checks** (✓/✗)
- **What:** Percentage of validation checks that passed
- **Target:** >95% (ideally 100%)
- **Failing?** Review application logs for errors

**Example:**
```
✓ checks: 98.50% ✓ 985 ✗ 15
```
- 985 checks passed, 15 failed
- 98.5% success rate
- ✅ Good (>95%)

#### **http_req_duration**
- **What:** Response time distribution
- **Target:**
  - API endpoints: p(95) <500ms, p(99) <1s
  - AI endpoints: p(95) <5s, p(99) <10s
  - SSR pages: p(95) <2s, p(99) <3s

**Percentiles explained:**
- `avg`: Average response time across all requests
- `min`: Fastest response
- `med`: Median (50th percentile) - half of requests faster/slower
- `max`: Slowest response
- `p(95)`: 95% of requests faster than this (our main target)
- `p(99)`: 99% of requests faster than this

**Example:**
```
http_req_duration: avg=245ms min=89ms med=201ms max=987ms p(95)=456ms p(99)=789ms
```
- p(95)=456ms: 95% of requests under 456ms
- ✅ Good for API (target: <500ms)

#### **http_req_failed**
- **What:** Percentage of HTTP requests that failed (4xx/5xx errors)
- **Target:** <1% (ideally 0%)
- **Failing?** Check HTTP status codes in logs

**Example:**
```
http_req_failed: 0.50% ✓ 5 ✗ 995
```
- 5 requests failed (4xx/5xx), 995 succeeded
- 0.5% error rate
- ✅ Good (<1%)

#### **http_reqs**
- **What:** Total HTTP requests made and requests per second
- **Use:** Measure throughput

**Example:**
```
http_reqs: 1000 16.6/s
```
- 1000 total requests
- 16.6 requests per second

#### **iterations**
- **What:** How many times the test function completed
- **Use:** Verify test ran expected number of times

#### **vus (Virtual Users)**
- **What:** Number of concurrent simulated users
- **Use:** Verify load scenario ran correctly

---

## 🎯 Interpreting Results by Endpoint Type

### API Endpoints (Projects, Documents, Characters, etc.)

**Good Results:**
```
✓ http_req_duration: p(95)<500ms ✓
✓ http_req_failed: <1% ✓
✓ checks: >95% ✓
```

**Needs Optimization:**
```
✗ http_req_duration: p(95)=1200ms (target: <500ms)
```
**Action:** Optimize database queries, add indexes, cache responses

**Errors:**
```
✗ http_req_failed: 5% (target: <1%)
```
**Action:** Check logs for 4xx/5xx errors, investigate failures

### AI Generation Endpoints

**Good Results:**
```
✓ http_req_duration: p(95)<5s ✓
✓ http_req_failed: <2% ✓
✓ ai_generate_success: >98% ✓
```

**Needs Optimization:**
```
✗ http_req_duration: p(95)=8s (target: <5s)
```
**Actions:**
- Check AI provider performance
- Reduce max_tokens if possible
- Consider caching similar requests
- Use faster models for simple tasks

### SSR Pages (Dashboard, Editor)

**Good Results:**
```
✓ http_req_duration: p(95)<2s ✓
✓ dashboard_load_success: >95% ✓
```

**Needs Optimization:**
```
✗ http_req_duration: p(95)=4s (target: <2s)
```
**Actions:**
- Optimize database queries in server components
- Add caching headers
- Reduce initial data fetching
- Use streaming/suspense for slow data

---

## 🔍 Common Performance Issues

### Issue 1: Slow Response Times

**Symptom:**
```
http_req_duration: p(95)=1500ms (target: <500ms)
```

**Diagnose:**

1. **Check which endpoint is slow:**
   ```
   project_list_duration: avg=450ms  ✅
   project_create_duration: avg=1800ms  ✗ SLOW!
   ```

2. **Check database queries:**
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM pg_stat_statements
   ORDER BY total_exec_time DESC
   LIMIT 10;
   ```

3. **Look for:**
   - Missing indexes
   - N+1 query problems
   - Sequential scans (should be index scans)
   - Complex joins

**Fix:**
```sql
-- Example: Add index on frequently queried column
CREATE INDEX CONCURRENTLY idx_documents_project_updated
ON documents(project_id, updated_at DESC);
```

### Issue 2: High Error Rate

**Symptom:**
```
http_req_failed: 15% ✗ (target: <1%)
```

**Diagnose:**

1. **Check response status codes:**
   ```javascript
   // Look for in test output
   'status 429': (r) => r.status === 429  // Rate limited
   'status 500': (r) => r.status === 500  // Server error
   'status 401': (r) => r.status === 401  // Auth failure
   ```

2. **Common causes:**
   - **429 (Too Many Requests)**: Rate limiting
     - Fix: Increase rate limits or reduce concurrency
   - **500 (Server Error)**: Application/database error
     - Fix: Check logs, fix bugs
   - **503 (Service Unavailable)**: Overloaded
     - Fix: Scale infrastructure, optimize queries
   - **401 (Unauthorized)**: Auth issues
     - Fix: Check test user credentials

### Issue 3: Database Connection Errors

**Symptom:**
```
Error: remaining connection slots are reserved
```

**Diagnose:**

1. **Check connection pool usage:**
   ```sql
   SELECT count(*) as connections
   FROM pg_stat_activity;
   ```

2. **Check pool size:**
   ```typescript
   // lib/supabase/server.ts
   const poolConfig = getPoolConfig()
   console.log('Max connections:', poolConfig.max)
   ```

**Fix:**
```typescript
// Increase connection pool (be careful!)
const poolConfig = {
  max: 20,  // Increase from default
  min: 2,
  idleTimeoutMillis: 30000,
}
```

Or reduce concurrent users in test.

### Issue 4: Timeout Errors

**Symptom:**
```
request timeout (default is 60s)
```

**Common on:**
- AI generation endpoints
- Complex database queries
- External API calls

**Fix:**
```javascript
// Increase timeout for specific endpoints
const response = http.post(url, payload, {
  headers,
  timeout: '120s',  // 2 minutes for AI
})
```

### Issue 5: Memory/CPU Issues

**Symptom:**
```
http_req_duration: steadily increasing over time
```

**Diagnose:**
- Memory leak
- Resource exhaustion
- Inefficient algorithms

**Fix:**
- Profile with Chrome DevTools / Node.js profiler
- Check for unclosed connections
- Optimize resource-intensive operations

---

## 📈 Performance Optimization Checklist

### Database Optimizations

- [ ] Add indexes on frequently queried columns
  ```sql
  CREATE INDEX CONCURRENTLY idx_table_column ON table(column);
  ```

- [ ] Use `select` to fetch only needed columns
  ```typescript
  .select('id, title, created_at')  // Not select('*')
  ```

- [ ] Optimize RLS policies (avoid complex subqueries)
  ```sql
  -- Instead of subquery
  CREATE POLICY "user_access" ON table
  FOR SELECT USING (user_id = auth.uid());
  ```

- [ ] Use connection pooling (Supabase does this by default)

- [ ] Add database caching where appropriate
  ```typescript
  // Cache frequently accessed, rarely changing data
  const cached = await redis.get(key)
  if (cached) return cached
  ```

### Application Optimizations

- [ ] Add HTTP caching headers
  ```typescript
  return new Response(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
  ```

- [ ] Implement request deduplication
  ```typescript
  // Use SWR, React Query, or custom deduplication
  ```

- [ ] Optimize N+1 queries with batch loading
  ```typescript
  // Instead of fetching in loop
  const allData = await supabase
    .from('table')
    .select('*')
    .in('id', ids)  // Batch fetch
  ```

- [ ] Use pagination for large datasets
  ```typescript
  .range(0, 99)  // Limit to 100 items
  ```

### Infrastructure Optimizations

- [ ] Use CDN for static assets (Vercel does this automatically)
- [ ] Enable Edge Functions for low latency
- [ ] Scale database (upgrade Supabase plan if needed)
- [ ] Use read replicas for read-heavy workloads
- [ ] Monitor and optimize cold starts

---

## 📊 Comparing Results Over Time

Track performance over time to catch regressions:

```bash
# Run same test weekly
npm run test:load

# Compare results
# 2025-01-24: p(95)=450ms ✅
# 2025-01-31: p(95)=480ms ⚠️ Slight increase
# 2025-02-07: p(95)=650ms ✗ REGRESSION!
```

**Performance Budget:**
- API endpoints: p(95) must stay <500ms
- AI generation: p(95) must stay <5s
- Error rate: Must stay <1%

Alert if any metric exceeds budget!

---

## 🎯 Action Plan Template

When you identify issues, use this template:

### Issue: [Brief Description]

**Metric:**
```
http_req_duration: p(95)=1200ms (target: <500ms)
```

**Affected Endpoint:**
- `/api/projects` (GET)

**Root Cause:**
- Missing index on `projects(user_id, updated_at)`
- N+1 query fetching related documents

**Fix:**
```sql
CREATE INDEX CONCURRENTLY idx_projects_user_updated
ON projects(user_id, updated_at DESC);
```

**Expected Improvement:**
- p(95): 1200ms → <500ms
- 60% reduction in query time

**Verification:**
```bash
npm run test:load:projects
# Check p(95) is now <500ms
```

---

## 📚 Additional Resources

- [Supabase Performance Tips](https://supabase.com/docs/guides/platform/performance)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [k6 Metrics Reference](https://k6.io/docs/using-k6/metrics/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)

---

**Remember:** Performance optimization is iterative. Measure, optimize, measure again!
