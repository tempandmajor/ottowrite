#!/usr/bin/env ts-node
/**
 * RLS Policy Verification Script
 *
 * Tests Row Level Security (RLS) policies across the database to ensure:
 * 1. Users can only see their own data
 * 2. Collaborators have appropriate access
 * 3. Anonymous users have no access to sensitive data
 * 4. Edge cases are handled correctly
 *
 * Usage:
 *   npx ts-node scripts/verify-rls-policies.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

interface TestUser {
  id: string;
  email: string;
  password: string;
}

const results: TestResult[] = [];

// Test users (will be created in setup)
let testUser1: TestUser;
let testUser2: TestUser;

/**
 * Service role client (bypasses RLS)
 */
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Anonymous client (public access)
 */
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Create authenticated clients for test users
 */
async function createAuthClient(email: string, password: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to sign in as ${email}: ${error.message}`);
  }

  return { client, userId: data.user!.id };
}

/**
 * Setup: Create test users and test data
 */
async function setup() {
  console.log('\n🔧 Setting up test environment...\n');

  // Create test users
  const timestamp = Date.now();
  testUser1 = {
    id: '',
    email: `rls-test-user1-${timestamp}@example.com`,
    password: 'TestPassword123!',
  };

  testUser2 = {
    id: '',
    email: `rls-test-user2-${timestamp}@example.com`,
    password: 'TestPassword123!',
  };

  // Create user 1
  const { data: user1Data, error: user1Error } = await serviceClient.auth.admin.createUser({
    email: testUser1.email,
    password: testUser1.password,
    email_confirm: true,
  });

  if (user1Error) {
    throw new Error(`Failed to create test user 1: ${user1Error.message}`);
  }
  testUser1.id = user1Data.user!.id;
  console.log(`✓ Created test user 1: ${testUser1.email} (${testUser1.id})`);

  // Create user 2
  const { data: user2Data, error: user2Error } = await serviceClient.auth.admin.createUser({
    email: testUser2.email,
    password: testUser2.password,
    email_confirm: true,
  });

  if (user2Error) {
    throw new Error(`Failed to create test user 2: ${user2Error.message}`);
  }
  testUser2.id = user2Data.user!.id;
  console.log(`✓ Created test user 2: ${testUser2.email} (${testUser2.id})`);

  // Create user profiles
  const { error: profile1Error } = await serviceClient
    .from('user_profiles')
    .insert({
      id: testUser1.id,
      email: testUser1.email,
      subscription_tier: 'free',
    });

  if (profile1Error) {
    throw new Error(`Failed to create profile for user 1: ${profile1Error.message}`);
  }

  const { error: profile2Error } = await serviceClient
    .from('user_profiles')
    .insert({
      id: testUser2.id,
      email: testUser2.email,
      subscription_tier: 'free',
    });

  if (profile2Error) {
    throw new Error(`Failed to create profile for user 2: ${profile2Error.message}`);
  }

  console.log('✓ Created user profiles\n');
}

/**
 * Cleanup: Remove test users and data
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up test environment...\n');

  // Delete test users
  if (testUser1?.id) {
    await serviceClient.auth.admin.deleteUser(testUser1.id);
    console.log(`✓ Deleted test user 1: ${testUser1.email}`);
  }

  if (testUser2?.id) {
    await serviceClient.auth.admin.deleteUser(testUser2.id);
    console.log(`✓ Deleted test user 2: ${testUser2.email}`);
  }
}

/**
 * Test: Anonymous users cannot access user_profiles
 */
async function testAnonCannotAccessUserProfiles(): Promise<TestResult> {
  const { data, error } = await anonClient.from('user_profiles').select('*').limit(1);

  if (error || !data || data.length === 0) {
    return {
      name: 'Anonymous cannot access user_profiles',
      passed: true,
      message: 'Anonymous users correctly denied access to user_profiles',
    };
  }

  return {
    name: 'Anonymous cannot access user_profiles',
    passed: false,
    message: 'Anonymous users can access user_profiles (security issue!)',
    details: { rowCount: data.length },
  };
}

/**
 * Test: Users can only see their own profile
 */
async function testUserCanOnlySeeOwnProfile(): Promise<TestResult> {
  const { client, userId } = await createAuthClient(testUser1.email, testUser1.password);

  const { data, error } = await client.from('user_profiles').select('*');

  await client.auth.signOut();

  if (error) {
    return {
      name: 'User can only see own profile',
      passed: false,
      message: `Error querying user_profiles: ${error.message}`,
      details: error,
    };
  }

  if (data.length === 1 && data[0].id === userId) {
    return {
      name: 'User can only see own profile',
      passed: true,
      message: 'Users can only see their own profile',
      details: { profileId: data[0].id, userId },
    };
  }

  return {
    name: 'User can only see own profile',
    passed: false,
    message: `User can see ${data.length} profiles (should be 1)`,
    details: { rowCount: data.length, profileIds: data.map(p => p.id), userId },
  };
}

/**
 * Test: Users can only create projects for themselves
 */
async function testUserCanOnlyCreateOwnProjects(): Promise<TestResult> {
  const { client, userId } = await createAuthClient(testUser1.email, testUser1.password);

  // Try to create project with correct user_id
  const { data: correctProject, error: correctError } = await client
    .from('projects')
    .insert({
      title: 'Test Project - Correct User',
      user_id: userId,
    })
    .select()
    .single();

  if (correctError) {
    await client.auth.signOut();
    return {
      name: 'User can create own projects',
      passed: false,
      message: `Cannot create project for own user_id: ${correctError.message}`,
      details: correctError,
    };
  }

  // Try to create project with different user_id
  const { data: wrongProject, error: wrongError } = await client
    .from('projects')
    .insert({
      title: 'Test Project - Wrong User',
      user_id: testUser2.id,
    })
    .select()
    .single();

  // Cleanup
  if (correctProject) {
    await serviceClient.from('projects').delete().eq('id', correctProject.id);
  }

  await client.auth.signOut();

  if (wrongProject || !wrongError) {
    return {
      name: 'User cannot create projects for others',
      passed: false,
      message: 'User was able to create project with different user_id (security issue!)',
      details: wrongProject,
    };
  }

  return {
    name: 'User can create own projects',
    passed: true,
    message: 'Users can create projects for themselves but not for others',
  };
}

/**
 * Test: Users can only see their own projects
 */
async function testUserCanOnlySeeOwnProjects(): Promise<TestResult> {
  // Create projects for both users
  const { data: project1, error: error1 } = await serviceClient
    .from('projects')
    .insert({
      title: 'User 1 Project',
      user_id: testUser1.id,
    })
    .select()
    .single();

  const { data: project2, error: error2 } = await serviceClient
    .from('projects')
    .insert({
      title: 'User 2 Project',
      user_id: testUser2.id,
    })
    .select()
    .single();

  if (error1 || error2) {
    return {
      name: 'User can only see own projects',
      passed: false,
      message: 'Failed to create test projects',
      details: { error1, error2 },
    };
  }

  // Sign in as user 1 and try to see projects
  const { client, userId } = await createAuthClient(testUser1.email, testUser1.password);
  const { data, error } = await client.from('projects').select('*');

  await client.auth.signOut();

  // Cleanup
  await serviceClient.from('projects').delete().eq('id', project1!.id);
  await serviceClient.from('projects').delete().eq('id', project2!.id);

  if (error) {
    return {
      name: 'User can only see own projects',
      passed: false,
      message: `Error querying projects: ${error.message}`,
      details: error,
    };
  }

  const canSeeOwnProject = data.some(p => p.id === project1!.id);
  const canSeeOtherProject = data.some(p => p.id === project2!.id);

  if (canSeeOwnProject && !canSeeOtherProject) {
    return {
      name: 'User can only see own projects',
      passed: true,
      message: 'Users can only see their own projects',
      details: { projectCount: data.length },
    };
  }

  if (canSeeOtherProject) {
    return {
      name: 'User can only see own projects',
      passed: false,
      message: 'User can see other users\' projects (security issue!)',
      details: { projectIds: data.map(p => p.id) },
    };
  }

  return {
    name: 'User can only see own projects',
    passed: false,
    message: 'User cannot see their own projects',
    details: { projectIds: data.map(p => p.id), expectedId: project1!.id },
  };
}

/**
 * Test: Collaborators can access shared projects
 */
async function testCollaboratorsCanAccessSharedProjects(): Promise<TestResult> {
  // Create project for user 1
  const { data: project, error: projectError } = await serviceClient
    .from('projects')
    .insert({
      title: 'Shared Project',
      user_id: testUser1.id,
    })
    .select()
    .single();

  if (projectError || !project) {
    return {
      name: 'Collaborators can access shared projects',
      passed: false,
      message: 'Failed to create test project',
      details: projectError,
    };
  }

  // Add user 2 as collaborator
  const { error: memberError } = await serviceClient
    .from('project_members')
    .insert({
      project_id: project.id,
      user_id: testUser2.id,
      role: 'editor',
    });

  if (memberError) {
    await serviceClient.from('projects').delete().eq('id', project.id);
    return {
      name: 'Collaborators can access shared projects',
      passed: false,
      message: 'Failed to add collaborator',
      details: memberError,
    };
  }

  // Sign in as user 2 and try to access the project
  const { client } = await createAuthClient(testUser2.email, testUser2.password);
  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('id', project.id)
    .single();

  await client.auth.signOut();

  // Cleanup
  await serviceClient.from('project_members').delete().eq('project_id', project.id);
  await serviceClient.from('projects').delete().eq('id', project.id);

  if (error || !data) {
    return {
      name: 'Collaborators can access shared projects',
      passed: false,
      message: 'Collaborators cannot access shared projects',
      details: error,
    };
  }

  return {
    name: 'Collaborators can access shared projects',
    passed: true,
    message: 'Collaborators can successfully access shared projects',
  };
}

/**
 * Test: Users can only see documents in their projects
 */
async function testUserCanOnlySeeOwnDocuments(): Promise<TestResult> {
  // Create projects and documents for both users
  const { data: project1, error: p1Error } = await serviceClient
    .from('projects')
    .insert({
      title: 'User 1 Project',
      user_id: testUser1.id,
    })
    .select()
    .single();

  const { data: project2, error: p2Error } = await serviceClient
    .from('projects')
    .insert({
      title: 'User 2 Project',
      user_id: testUser2.id,
    })
    .select()
    .single();

  if (p1Error || p2Error || !project1 || !project2) {
    return {
      name: 'User can only see own documents',
      passed: false,
      message: 'Failed to create test projects',
      details: { p1Error, p2Error },
    };
  }

  const { data: doc1, error: d1Error } = await serviceClient
    .from('documents')
    .insert({
      title: 'User 1 Document',
      project_id: project1.id,
      user_id: testUser1.id,
      content: 'Test content 1',
    })
    .select()
    .single();

  const { data: doc2, error: d2Error } = await serviceClient
    .from('documents')
    .insert({
      title: 'User 2 Document',
      project_id: project2.id,
      user_id: testUser2.id,
      content: 'Test content 2',
    })
    .select()
    .single();

  if (d1Error || d2Error || !doc1 || !doc2) {
    await serviceClient.from('projects').delete().eq('id', project1.id);
    await serviceClient.from('projects').delete().eq('id', project2.id);
    return {
      name: 'User can only see own documents',
      passed: false,
      message: 'Failed to create test documents',
      details: { d1Error, d2Error },
    };
  }

  // Sign in as user 1 and try to see documents
  const { client } = await createAuthClient(testUser1.email, testUser1.password);
  const { data, error } = await client.from('documents').select('*');

  await client.auth.signOut();

  // Cleanup
  await serviceClient.from('documents').delete().eq('id', doc1.id);
  await serviceClient.from('documents').delete().eq('id', doc2.id);
  await serviceClient.from('projects').delete().eq('id', project1.id);
  await serviceClient.from('projects').delete().eq('id', project2.id);

  if (error) {
    return {
      name: 'User can only see own documents',
      passed: false,
      message: `Error querying documents: ${error.message}`,
      details: error,
    };
  }

  const canSeeOwnDoc = data.some(d => d.id === doc1.id);
  const canSeeOtherDoc = data.some(d => d.id === doc2.id);

  if (canSeeOwnDoc && !canSeeOtherDoc) {
    return {
      name: 'User can only see own documents',
      passed: true,
      message: 'Users can only see documents in their own projects',
      details: { documentCount: data.length },
    };
  }

  if (canSeeOtherDoc) {
    return {
      name: 'User can only see own documents',
      passed: false,
      message: 'User can see other users\' documents (security issue!)',
      details: { documentIds: data.map(d => d.id) },
    };
  }

  return {
    name: 'User can only see own documents',
    passed: false,
    message: 'User cannot see their own documents',
    details: { documentIds: data.map(d => d.id), expectedId: doc1.id },
  };
}

/**
 * Test: Anonymous users cannot access ai_usage
 */
async function testAnonCannotAccessAiUsage(): Promise<TestResult> {
  const { data, error } = await anonClient.from('ai_usage').select('*').limit(1);

  if (error || !data || data.length === 0) {
    return {
      name: 'Anonymous cannot access ai_usage',
      passed: true,
      message: 'Anonymous users correctly denied access to ai_usage',
    };
  }

  return {
    name: 'Anonymous cannot access ai_usage',
    passed: false,
    message: 'Anonymous users can access ai_usage (security issue!)',
    details: { rowCount: data.length },
  };
}

/**
 * Test: Users can only see their own ai_usage
 */
async function testUserCanOnlySeeOwnAiUsage(): Promise<TestResult> {
  // Create AI usage records for both users
  const { error: usage1Error } = await serviceClient.from('ai_usage').insert({
    user_id: testUser1.id,
    usage_type: 'chat',
    tokens_used: 100,
  });

  const { error: usage2Error } = await serviceClient.from('ai_usage').insert({
    user_id: testUser2.id,
    usage_type: 'chat',
    tokens_used: 200,
  });

  if (usage1Error || usage2Error) {
    return {
      name: 'User can only see own ai_usage',
      passed: false,
      message: 'Failed to create test AI usage records',
      details: { usage1Error, usage2Error },
    };
  }

  // Sign in as user 1 and try to see AI usage
  const { client, userId } = await createAuthClient(testUser1.email, testUser1.password);
  const { data, error } = await client.from('ai_usage').select('*');

  await client.auth.signOut();

  // Cleanup
  await serviceClient.from('ai_usage').delete().eq('user_id', testUser1.id);
  await serviceClient.from('ai_usage').delete().eq('user_id', testUser2.id);

  if (error) {
    return {
      name: 'User can only see own ai_usage',
      passed: false,
      message: `Error querying ai_usage: ${error.message}`,
      details: error,
    };
  }

  const allBelongToUser = data.every(record => record.user_id === userId);
  const hasSomeRecords = data.length > 0;

  if (hasSomeRecords && allBelongToUser) {
    return {
      name: 'User can only see own ai_usage',
      passed: true,
      message: 'Users can only see their own AI usage',
      details: { recordCount: data.length },
    };
  }

  if (!allBelongToUser) {
    return {
      name: 'User can only see own ai_usage',
      passed: false,
      message: 'User can see other users\' AI usage (security issue!)',
      details: { userIds: [...new Set(data.map(r => r.user_id))] },
    };
  }

  return {
    name: 'User can only see own ai_usage',
    passed: false,
    message: 'User cannot see their own AI usage',
    details: { recordCount: data.length },
  };
}

/**
 * Test: Anonymous users cannot access manuscript_submissions
 */
async function testAnonCannotAccessManuscriptSubmissions(): Promise<TestResult> {
  const { data, error } = await anonClient.from('manuscript_submissions').select('*').limit(1);

  if (error || !data || data.length === 0) {
    return {
      name: 'Anonymous cannot access manuscript_submissions',
      passed: true,
      message: 'Anonymous users correctly denied access to manuscript submissions',
    };
  }

  return {
    name: 'Anonymous cannot access manuscript_submissions',
    passed: false,
    message: 'Anonymous users can access manuscript submissions (security issue!)',
    details: { rowCount: data.length },
  };
}

/**
 * Test: Users can only see their own manuscript submissions
 */
async function testUserCanOnlySeeOwnManuscriptSubmissions(): Promise<TestResult> {
  // Create projects first
  const { data: project1, error: p1Error } = await serviceClient
    .from('projects')
    .insert({
      title: 'User 1 Project',
      user_id: testUser1.id,
    })
    .select()
    .single();

  const { data: project2, error: p2Error } = await serviceClient
    .from('projects')
    .insert({
      title: 'User 2 Project',
      user_id: testUser2.id,
    })
    .select()
    .single();

  if (p1Error || p2Error || !project1 || !project2) {
    return {
      name: 'User can only see own manuscript submissions',
      passed: false,
      message: 'Failed to create test projects',
      details: { p1Error, p2Error },
    };
  }

  // Create manuscript submissions
  const { data: sub1, error: s1Error } = await serviceClient
    .from('manuscript_submissions')
    .insert({
      user_id: testUser1.id,
      project_id: project1.id,
      title: 'User 1 Submission',
      genre: 'fiction',
      word_count: 80000,
      status: 'draft',
    })
    .select()
    .single();

  const { data: sub2, error: s2Error } = await serviceClient
    .from('manuscript_submissions')
    .insert({
      user_id: testUser2.id,
      project_id: project2.id,
      title: 'User 2 Submission',
      genre: 'fiction',
      word_count: 90000,
      status: 'draft',
    })
    .select()
    .single();

  if (s1Error || s2Error || !sub1 || !sub2) {
    await serviceClient.from('projects').delete().eq('id', project1.id);
    await serviceClient.from('projects').delete().eq('id', project2.id);
    return {
      name: 'User can only see own manuscript submissions',
      passed: false,
      message: 'Failed to create test submissions',
      details: { s1Error, s2Error },
    };
  }

  // Sign in as user 1 and try to see submissions
  const { client, userId } = await createAuthClient(testUser1.email, testUser1.password);
  const { data, error } = await client.from('manuscript_submissions').select('*');

  await client.auth.signOut();

  // Cleanup
  await serviceClient.from('manuscript_submissions').delete().eq('id', sub1.id);
  await serviceClient.from('manuscript_submissions').delete().eq('id', sub2.id);
  await serviceClient.from('projects').delete().eq('id', project1.id);
  await serviceClient.from('projects').delete().eq('id', project2.id);

  if (error) {
    return {
      name: 'User can only see own manuscript submissions',
      passed: false,
      message: `Error querying manuscript_submissions: ${error.message}`,
      details: error,
    };
  }

  const canSeeOwnSub = data.some(s => s.id === sub1.id);
  const canSeeOtherSub = data.some(s => s.id === sub2.id);

  if (canSeeOwnSub && !canSeeOtherSub) {
    return {
      name: 'User can only see own manuscript submissions',
      passed: true,
      message: 'Users can only see their own manuscript submissions',
      details: { submissionCount: data.length },
    };
  }

  if (canSeeOtherSub) {
    return {
      name: 'User can only see own manuscript submissions',
      passed: false,
      message: 'User can see other users\' manuscript submissions (security issue!)',
      details: { submissionIds: data.map(s => s.id) },
    };
  }

  return {
    name: 'User can only see own manuscript submissions',
    passed: false,
    message: 'User cannot see their own manuscript submissions',
    details: { submissionIds: data.map(s => s.id), expectedId: sub1.id },
  };
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║       RLS Policy Verification Test Suite          ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    await setup();

    console.log('🧪 Running RLS policy tests...\n');

    // Anonymous access tests
    console.log('📋 Testing anonymous user access...');
    results.push(await testAnonCannotAccessUserProfiles());
    results.push(await testAnonCannotAccessAiUsage());
    results.push(await testAnonCannotAccessManuscriptSubmissions());

    // User profile tests
    console.log('\n📋 Testing user profile isolation...');
    results.push(await testUserCanOnlySeeOwnProfile());

    // Project tests
    console.log('\n📋 Testing project access and isolation...');
    results.push(await testUserCanOnlyCreateOwnProjects());
    results.push(await testUserCanOnlySeeOwnProjects());
    results.push(await testCollaboratorsCanAccessSharedProjects());

    // Document tests
    console.log('\n📋 Testing document access and isolation...');
    results.push(await testUserCanOnlySeeOwnDocuments());

    // AI usage tests
    console.log('\n📋 Testing AI usage data isolation...');
    results.push(await testUserCanOnlySeeOwnAiUsage());

    // Manuscript submission tests
    console.log('\n📋 Testing manuscript submission isolation...');
    results.push(await testUserCanOnlySeeOwnManuscriptSubmissions());

    // Print results
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║              Test Results Summary                  ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
      console.log(`   ${result.message}`);
      if (result.details && !result.passed) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      console.log('');
    });

    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║                 Final Summary                      ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
    console.log('');

    if (failed === 0) {
      console.log('🎉 All RLS policy tests passed! Your database is secure.\n');
    } else {
      console.log('⚠️  Some tests failed. Please review the security issues above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Run the tests
runTests();
