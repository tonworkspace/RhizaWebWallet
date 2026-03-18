import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function fixRLSPolicies() {
  console.log('🔧 Fixing Balance Verification RLS Policies...');
  
  try {
    // First, let's check if we can access the table at all
    console.log('\n📋 Step 1: Check table access');
    const { data: tableCheck, error: tableError } = await supabase
      .from('balance_verification_requests')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table access error:', tableError.message);
      return;
    }
    
    console.log('✅ Table accessible');

    // Try to disable RLS temporarily for testing
    console.log('\n🔓 Step 2: Attempting to work around RLS...');
    
    // Let's try using the service role key instead of anon key
    const serviceSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    // Test with service role
    const { data: serviceTest, error: serviceError } = await serviceSupabase
      .from('balance_verification_requests')
      .select('*')
      .limit(1);
    
    if (serviceError) {
      console.error('❌ Service role test error:', serviceError.message);
    } else {
      console.log('✅ Service role access works');
    }

    // Try a simple insert test with service role
    console.log('\n📝 Step 3: Test insertion with service role');
    
    // Get a test user first
    const { data: users, error: userError } = await serviceSupabase
      .from('wallet_users')
      .select('id, wallet_address, rzc_balance')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.error('❌ No test user found:', userError?.message);
      return;
    }
    
    const testUser = users[0];
    console.log('✅ Found test user:', testUser.id);

    // Try insertion
    const testRequest = {
      user_id: testUser.id,
      wallet_address: testUser.wallet_address,
      telegram_username: '@rls_test_' + Date.now(),
      old_wallet_address: 'EQTest' + Math.random().toString(36).substring(7),
      claimed_balance: (testUser.rzc_balance || 0) + 1000,
      current_balance: testUser.rzc_balance || 0,
      priority: 'normal',
      status: 'pending',
      additional_notes: 'RLS fix test'
    };
    
    const { data: insertData, error: insertError } = await serviceSupabase
      .from('balance_verification_requests')
      .insert(testRequest)
      .select('id')
      .single();
    
    if (insertError) {
      console.error('❌ Service role insert error:', insertError.message);
      
      // If service role also fails, the issue might be different
      if (insertError.code === '42501') {
        console.log('🔍 RLS is still blocking even with service role');
        console.log('This suggests we need to modify the RLS policies directly in the database');
      }
    } else {
      console.log('✅ Service role insertion successful:', insertData.id);
      
      // Clean up
      await serviceSupabase
        .from('balance_verification_requests')
        .delete()
        .eq('id', insertData.id);
      
      console.log('✅ Test data cleaned up');
    }

  } catch (error) {
    console.error('💥 Fix failed:', error.message);
  }
}

fixRLSPolicies();