// Test Balance Verification Submission
// Run this in browser console after logging in

async function testVerificationSubmission() {
  console.log('🧪 Testing Balance Verification Submission...\n');
  
  // Get Supabase client
  const supabase = window.supabase || (await import('./services/supabaseService')).supabaseService.getClient();
  
  if (!supabase) {
    console.error('❌ Supabase client not found');
    return;
  }
  
  // Test data
  const testData = {
    p_telegram_username: '@testuser',
    p_old_wallet_address: 'EQTest123OldWallet456',
    p_claimed_balance: 5000,
    p_screenshot_url: null,
    p_additional_notes: 'Test submission from browser console'
  };
  
  console.log('📝 Test Data:', testData);
  console.log('');
  
  try {
    // Call the RPC function
    console.log('🔄 Calling submit_balance_verification_request...');
    const { data, error } = await supabase.rpc(
      'submit_balance_verification_request',
      testData
    );
    
    if (error) {
      console.error('❌ RPC Error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return;
    }
    
    console.log('✅ RPC Response:', data);
    console.log('');
    
    if (data && data.success) {
      console.log('🎉 SUCCESS! Verification request submitted!');
      console.log('');
      console.log('📋 Request Details:');
      console.log('  Request ID:', data.request_id);
      console.log('  Priority:', data.priority);
      console.log('  Discrepancy:', data.discrepancy_amount, 'RZC');
      console.log('  Status:', data.status);
      console.log('  Message:', data.message);
      console.log('');
      console.log('✅ Check Admin Dashboard → Balance Verification tab');
      console.log('✅ You should see this request with PENDING status');
    } else {
      console.error('❌ Submission failed:', data?.error || 'Unknown error');
      console.log('');
      console.log('Possible issues:');
      console.log('  1. User not logged in');
      console.log('  2. User profile not found');
      console.log('  3. Existing pending request');
      console.log('  4. RPC function not created');
      console.log('  5. RLS policies blocking');
    }
    
  } catch (err) {
    console.error('❌ Exception:', err);
    console.error('Stack:', err.stack);
  }
}

// Also test getting verification status
async function testGetVerificationStatus() {
  console.log('\n🧪 Testing Get Verification Status...\n');
  
  const supabase = window.supabase || (await import('./services/supabaseService')).supabaseService.getClient();
  
  if (!supabase) {
    console.error('❌ Supabase client not found');
    return;
  }
  
  try {
    console.log('🔄 Calling get_user_verification_status...');
    const { data, error } = await supabase.rpc('get_user_verification_status');
    
    if (error) {
      console.error('❌ RPC Error:', error);
      return;
    }
    
    console.log('✅ Status Response:', data);
    console.log('');
    
    if (data && data.success) {
      console.log('📊 Verification Status:');
      console.log('  Has Request:', data.has_request);
      if (data.request) {
        console.log('  Request ID:', data.request.id);
        console.log('  Status:', data.request.status);
        console.log('  Priority:', data.request.priority);
        console.log('  Claimed Balance:', data.request.claimed_balance);
        console.log('  Current Balance:', data.request.current_balance);
        console.log('  Discrepancy:', data.request.discrepancy_amount);
      }
    } else {
      console.error('❌ Failed to get status:', data?.error);
    }
    
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

// Run tests
console.log('═══════════════════════════════════════════════════════════');
console.log('  BALANCE VERIFICATION SUBMISSION TEST');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

testVerificationSubmission().then(() => {
  setTimeout(() => {
    testGetVerificationStatus();
  }, 1000);
});

// Export for manual use
window.testVerificationSubmission = testVerificationSubmission;
window.testGetVerificationStatus = testGetVerificationStatus;

console.log('');
console.log('💡 You can also run these manually:');
console.log('   testVerificationSubmission()');
console.log('   testGetVerificationStatus()');
