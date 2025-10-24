# Load Testing Setup Guide

Step-by-step guide to set up your environment for running load tests.

## Prerequisites

### 1. Install k6

**macOS:**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

**Verify installation:**
```bash
k6 version
# Output: k6 v0.48.0 (or similar)
```

## Creating Test Users

Load tests require dedicated test user accounts. **Never use real user accounts for load testing!**

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add user** → **Create new user**
4. Create 3 users with these credentials:

**User 1:**
- Email: `loadtest1@example.com`
- Password: `TestPassword123!`
- Auto Confirm User: ✅ Yes

**User 2:**
- Email: `loadtest2@example.com`
- Password: `TestPassword123!`
- Auto Confirm User: ✅ Yes

**User 3:**
- Email: `loadtest3@example.com`
- Password: `TestPassword123!`
- Auto Confirm User: ✅ Yes

5. Verify users are created and email confirmed

### Option 2: Using Supabase SQL Editor

1. Go to **SQL Editor** in Supabase dashboard
2. Run this SQL script:

```sql
-- Create test users for load testing
-- These users will have confirmed emails

-- User 1
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'loadtest1@example.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  ''
);

-- User 2
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'loadtest2@example.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  ''
);

-- User 3
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'loadtest3@example.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  ''
);
```

3. Verify users are created:

```sql
SELECT email, email_confirmed_at, created_at
FROM auth.users
WHERE email LIKE 'loadtest%'
ORDER BY email;
```

### Option 3: Using API (Sign Up Endpoint)

If your app allows user registration:

```bash
# User 1
curl -X POST 'https://your-project.supabase.co/auth/v1/signup' \
  -H 'Content-Type: application/json' \
  -H 'apikey: YOUR_ANON_KEY' \
  -d '{
    "email": "loadtest1@example.com",
    "password": "TestPassword123!"
  }'

# User 2
curl -X POST 'https://your-project.supabase.co/auth/v1/signup' \
  -H 'Content-Type: application/json' \
  -H 'apikey: YOUR_ANON_KEY' \
  -d '{
    "email": "loadtest2@example.com",
    "password": "TestPassword123!"
  }'

# User 3
curl -X POST 'https://your-project.supabase.co/auth/v1/signup' \
  -H 'Content-Type: application/json' \
  -H 'apikey: YOUR_ANON_KEY' \
  -d '{
    "email": "loadtest3@example.com",
    "password": "TestPassword123!"
  }'
```

Then confirm emails in Supabase dashboard.

## Environment Configuration

1. **Copy the environment template:**
   ```bash
   cp load-tests/.env.example load-tests/.env.local
   ```

2. **Edit `.env.local` with your values:**
   ```bash
   # Open in your editor
   code load-tests/.env.local  # VS Code
   # OR
   nano load-tests/.env.local  # Terminal
   ```

3. **Fill in the values:**

```env
# Application URL to test
# Use staging URL for realistic testing
# NEVER use production URL!
BASE_URL=https://your-staging-app.vercel.app

# Supabase Configuration
# Get these from your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Test User Credentials
# Match the users you created above
TEST_USER_1_EMAIL=loadtest1@example.com
TEST_USER_1_PASSWORD=TestPassword123!

TEST_USER_2_EMAIL=loadtest2@example.com
TEST_USER_2_PASSWORD=TestPassword123!

TEST_USER_3_EMAIL=loadtest3@example.com
TEST_USER_3_PASSWORD=TestPassword123!
```

4. **Verify configuration:**
   ```bash
   # Check file exists and has values
   cat load-tests/.env.local | grep -v '^#' | grep -v '^$'
   ```

## Verify Setup

Run a quick test to verify everything is configured correctly:

```bash
# Test authentication
k6 run --iterations 1 load-tests/tests/projects-api.test.js
```

You should see:
```
✓ auth successful
✓ access token received
...
checks.........................: 100.00%
```

If you see authentication errors:
- Verify user credentials in `.env.local`
- Ensure users exist in Supabase
- Check Supabase URL and anon key are correct
- Verify users have confirmed emails

## Database Setup (Optional)

For isolated testing, you can create a separate test database:

1. **Create a new Supabase project** for testing
2. **Run migrations** to create tables
3. **Point load tests** to test database

**OR**

Use Supabase branching (if available on your plan):
```bash
supabase branches create load-testing
supabase link --project-ref your-project-ref --branch load-testing
```

## Next Steps

Once setup is complete:

1. ✅ Test users created and verified
2. ✅ Environment variables configured
3. ✅ k6 installed and working
4. ✅ Quick test passed

You're ready to run load tests!

```bash
# Start with a normal scenario
npm run test:load

# Or run specific tests
npm run test:load:projects
npm run test:load:journey
```

See [README.md](./README.md) for full testing guide.

## Troubleshooting

### "k6: command not found"

k6 is not installed. Follow installation instructions above.

### "Failed to authenticate user: loadtest1@example.com"

Possible causes:
- User doesn't exist in Supabase
- Wrong password in `.env.local`
- Wrong Supabase URL or anon key
- User email not confirmed

**Fix:**
1. Check Supabase dashboard → Authentication → Users
2. Verify user exists and email is confirmed
3. Try logging in manually to verify credentials

### "No such file or directory: .env.local"

`.env.local` doesn't exist.

**Fix:**
```bash
cp load-tests/.env.example load-tests/.env.local
# Then edit with your values
```

### "Error: ECONNREFUSED"

Can't connect to the application.

**Fix:**
- Verify `BASE_URL` in `.env.local`
- Ensure application is running
- Check network/firewall settings

### Rate Limit Errors (429)

Hitting rate limits too quickly.

**Fix:**
- Reduce concurrent users in test scenario
- Increase rate limits in `lib/security/api-rate-limiter.ts`
- Add delays between requests

### Database Connection Errors

**Fix:**
- Check Supabase project is running
- Verify connection pool size
- Reduce concurrent users
- Use pgBouncer (Supabase includes this)

## Security Reminders

⚠️ **Important Security Notes:**

1. ✅ **DO** use dedicated test accounts
2. ✅ **DO** use staging environment
3. ✅ **DO** use separate test database
4. ✅ **DO** clean up test data after tests
5. ❌ **DON'T** use production environment
6. ❌ **DON'T** use real user accounts
7. ❌ **DON'T** commit `.env.local` to git
8. ❌ **DON'T** run tests during peak hours

## Need Help?

- Check [README.md](./README.md) for full documentation
- Review [k6 documentation](https://k6.io/docs/)
- Check test logs in `load-tests/reports/`
- Review application logs during test runs

---

**Ready to test!** 🚀

Once setup is complete, start with:
```bash
npm run test:load
```
