/**
 * Create Admin User Script
 * 
 * Creates an admin user via Supabase Auth and sets role in app_users.
 * Handles email confirmation issues.
 * 
 * Usage: node create_admin.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ownwvonwntwyonbwlnzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93bnd2b253bnR3eW9uYndsbnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NTU2OTksImV4cCI6MjA5OTUzMTY5OX0.v_vw3GgBoSSE2BzycLC64Nml0ioYgsR9b8sKpVyCWG0';

// ---- Admin credentials ----
const ADMIN_EMAIL = 'admin@prarthana.app';
const ADMIN_PASSWORD = 'Admin@123456';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createAdmin() {
  console.log('Attempting to create/sign-in admin user...');
  console.log(`  Email: ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);

  // First try signing in (user may already exist)
  console.log('\n1. Trying to sign in (in case user already exists)...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (!signInError && signInData?.session) {
    console.log('✅ Signed in successfully! User ID:', signInData.user.id);
    await setAdminRole(signInData.user.id, signInData.user.email);
    return;
  }

  console.log('Sign-in failed:', signInError?.message || 'No session');

  // Try signing up with email data to auto-confirm
  console.log('\n2. Trying to sign up...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    options: {
      data: {
        role: 'admin',
      },
      // Don't redirect on email confirmation
      emailRedirectTo: undefined,
    },
  });

  if (signUpError) {
    console.error('\n❌ Sign up failed:', signUpError.message);
    
    if (signUpError.message.includes('confirmation email') || signUpError.message.includes('sending')) {
      console.log('\n========================================');
      console.log('SMTP / Email confirmation issue detected.');
      console.log('========================================');
      console.log('\nYou need to either:');
      console.log('');
      console.log('OPTION A (Recommended): Disable email confirmation');
      console.log('  1. Go to: https://supabase.com/dashboard/project/ownwvonwntwyonbwlnzl/auth/providers');
      console.log('  2. Under "Email", toggle OFF "Confirm email"');
      console.log('  3. Save and re-run this script: node create_admin.js');
      console.log('');
      console.log('OPTION B: Create user from Dashboard');
      console.log('  1. Go to: https://supabase.com/dashboard/project/ownwvonwntwyonbwlnzl/auth/users');
      console.log('  2. Click "Add user" > "Create new user"');
      console.log(`  3. Email: ${ADMIN_EMAIL}`);
      console.log(`  4. Password: ${ADMIN_PASSWORD}`);
      console.log('  5. Check "Auto Confirm User"');
      console.log('  6. Click "Create user"');
      console.log('  7. Then re-run this script to set the admin role: node create_admin.js');
      console.log('');
      console.log('OPTION C: Configure SMTP');
      console.log('  1. Go to: https://supabase.com/dashboard/project/ownwvonwntwyonbwlnzl/settings/auth');
      console.log('  2. Configure SMTP settings with valid credentials');
      console.log('  3. Re-run this script');
    }
    process.exit(1);
  }

  if (signUpData?.user) {
    console.log('User created. ID:', signUpData.user.id);
    if (signUpData.session) {
      console.log('Session obtained (auto-confirmed).');
      await setAdminRole(signUpData.user.id, signUpData.user.email);
    } else {
      console.log('\n⚠️  User created but needs email confirmation.');
      console.log('Please confirm the user manually in your Supabase dashboard, then re-run.');
    }
  }
}

async function setAdminRole(userId, email) {
  console.log('\n3. Setting admin role in app_users table...');
  
  // First check if role column exists by trying to select it
  const { data: existing, error: selectError } = await supabase
    .from('app_users')
    .select('id, role')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (selectError && selectError.message.includes('role')) {
    console.log('\n⚠️  "role" column does not exist in app_users table.');
    console.log('Adding it via the Supabase dashboard:');
    console.log('  1. Go to Table Editor > app_users');
    console.log('  2. Add column: "role" (type: text, default: "user")');
    console.log('  3. Re-run this script.');
    return;
  }

  const { data, error } = await supabase
    .from('app_users')
    .upsert(
      {
        auth_user_id: userId,
        email: email,
        name: 'Admin',
        role: 'admin',
      },
      { onConflict: 'auth_user_id' }
    )
    .select();

  if (error) {
    console.error('Failed to set admin role:', error.message);
    
    if (error.message.includes('role') || error.code === '42703') {
      console.log('\n⚠️  The "role" column might not exist in app_users table.');
      console.log('Please add it in your Supabase dashboard:');
      console.log('  1. Go to Table Editor > app_users');
      console.log('  2. Add column: "role" (type: text, default: "user")');
      console.log('  3. Re-run this script.');
    } else if (error.message.includes('policy') || error.code === '42501') {
      console.log('\n⚠️  RLS policy is blocking the write.');
      console.log('Please set the admin role manually in the Supabase dashboard:');
      console.log('  1. Go to Table Editor > app_users');
      console.log(`  2. Find the row with auth_user_id = ${userId}`);
      console.log('  3. Set role = "admin"');
    }
    return;
  }

  console.log('\n✅ ✅ ✅  Admin user created and role set successfully!');
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║      Admin Login Credentials         ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Email:    ${ADMIN_EMAIL}    ║`);
  console.log(`║  Password: ${ADMIN_PASSWORD}         ║`);
  console.log('╚══════════════════════════════════════╝\n');
}

createAdmin().catch(console.error);
