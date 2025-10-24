#!/usr/bin/env tsx
/**
 * Quick script to fix remaining 5 AI routes with security patterns
 */

import fs from 'fs';
import path from 'path';

const routes = [
  'app/api/ai/background-task/route.ts',
  'app/api/ai/health-check/route.ts',
  'app/api/ai/placeholder/route.ts',
  'app/api/ai/recommend-template/route.ts',
  'app/api/ai/writers-like-you/route.ts',
];

for (const route of routes) {
  const filePath = path.join(process.cwd(), route);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add imports
  if (!content.includes('@/lib/api/auth-helpers')) {
    content = content.replace(
      "import { createClient } from '@/lib/supabase/server'",
      "import { requireAuth } from '@/lib/api/auth-helpers'"
    );
  }

  if (!content.includes('@/lib/api/rate-limit-helpers')) {
    content = content.replace(
      "import { errorResponses",
      "import { requireAIRateLimit } from '@/lib/api/rate-limit-helpers';\nimport { errorResponses"
    );
  }

  // Replace auth patterns
  content = content.replace(
    /const supabase = await createClient\(\);\s+\/\/ Check authentication\s+const\s+\{\s+data:\s+\{\s+user\s+\},\s+error:\s+authError,?\s*\}\s*=\s*await supabase\.auth\.getUser\(\);\s+if\s+\(authError\s+\|\|\s+!user\)\s+\{[^}]+return errorResponses\.unauthorized\([^)]*\);\s+\}/gs,
    'const { user, supabase } = await requireAuth(request);\n    await requireAIRateLimit(request, user.id);'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed: ${route}`);
}

console.log('\n✅ All AI routes fixed!');
