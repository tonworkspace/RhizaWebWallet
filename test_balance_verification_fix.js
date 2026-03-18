import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testBalanceVerificationFix() {
  console.log('🧪 Testing Balance Verification Fix');
  console.log('=====================================');

  try {
    // Test 1: Check if we can access the table directly
    console.log('\n📋 Step 1: Check table access');
    const { data: tableData, error: tableError } = await supabase
      .from('balance_verification_requests')
      .select('*', { count: 'exact' })
      .limit(0);
    
    if (tableError) {
      console.error('❌ Table access error:', tableError.message);
      return;
    }
    
    console.log('✅ Table accessible, current records:', tableData?.length || 0);

    // Test 2: Check if we can find a test wallet user
    console.log('\n👤 Step 2: Find test wallet user');
    const { data: users, error: userError } = await supabase
      .from('wallet_users')
      .select('id, wallet_address, name, rzc_balance')
      .limit(1);
    
    if (userError) {
      console.error('❌ User lookup error:', userError.message);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️ No users found in database');
      return;
    }
    
    const testUser = users[0];
    console.log('✅ Found test user:', {
      id: testUser.id,
      wallet: testUser.wallet_address.slice(0, 10) + '...',
      name: testUser.name,
      balance: testUser.rzc_balance
    });

    // Test 3: Try direct insertion (simulating the new method)
    console.log('\n📝 Step 3: Test direct verification request insertion');
    
    const testRequest = {
      user_id: testUser.id,
      wallet_address: testUser.wallet_address,
      telegram_username: '@test_user_' + Date.now(),
      old_wallet_address: 'EQTest' + Math.random().toString(36).substring(7),
      claimed_balance: (testUser.rzc_balance || 0) + 1000,
      current_balance: testUser.rzc_balance || 0,
      screenshot_url: null,
      additional_notes: 'Test verification request from fix',
      priority: 'normal',
      status: 'pending'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('balance_verification_requests')
      .insert(testRequest)
      .select('id, status, priority, created_at')
      .single();
    
    if (insertError) {
      console.error('❌ Insert error:', insertError.message);
      return;
    }
    
    console.log('✅ Verification request inserted successfully:', {
      id: insertData.id,
      status: insertData.status,
      priority: insertData.priority,
      created_at: insertData.created_at
    });

    // Test 4: Check if we can read it back
    console.log('\n🔍 Step 4: Verify insertion by reading back');
    const { data: readData, error: readError } = await supabase
      .from('balance_verification_requests')
      .select('*')
      .eq('id', insertData.id)
      .single();
    
    if (readError) {
      console.error('❌ Read error:', readError.message);
      return;
    }
    
    console.log('✅ Successfully read back verification request:', {
      telegram_username: readData.telegram_username,
      claimed_balance: readData.claimed_balance,
      current_balance: readData.current_balance,
      discrepancy: readData.claimed_balance - readData.current_balance
    });

    // Test 5: Clean up test data
    console.log('\n🧹 Step 5: Clean up test data');
    const { error: deleteError } = await supabase
      .from('balance_verification_requests')
      .delete()
      .eq('id', insertData.id);
    
    if (deleteError) {
      console.warn('⚠️ Cleanup warning:', deleteError.message);
    } else {
      console.log('✅ Test data cleaned up');
    }

    console.log('\n🎉 Balance Verification Fix Test PASSED!');
    console.log('The new direct insertion method should work correctly.');

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

testBalanceVerificationFix();