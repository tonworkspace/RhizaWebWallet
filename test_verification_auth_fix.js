// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 TEST BALANCE VERIFICATION AUTH FIX
// ═══════════════════════════════════════════════════════════════════════════════
// Run this in browser console AFTER logging in with your wallet

console.log('🧪 Testing Balance Verification Auth Fix...\n');

const supabase = window.supabase || window.supabaseClient;

if (!supabase) {
  console.error('❌ Supabase client not found!');
} else {
  (async () => {
    try {
      // Step 1: Check if we have an active Supabase auth session
      console.log('📋 Step 1: Checking Supabase auth session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        return;
      }
      
      if (!session) {
        console.error('❌ No Supabase auth session found!');
        console.log('This means the wallet login did not create a Supabase session.');
        console.log('Please log out and log in again to test the fix.');
        return;
      }
      
      console.log('✅ Supabase auth session found!');
      console.log('User ID:', session.user.id);
      console.log('Email:', session.user.email);
      console.log('Wallet Address in metadata:', session.user.user_metadata?.wallet_address);
      console.log('');
      
      // Step 2: Try to submit a test verification request
      console.log('📋 Step 2: Testing verification request submission...');
      
      const testData = {
        p_telegram_username: '@testuser_' + Date.now(),
        p_old_wallet_address: 'EQTest' + Math.random().toString(36).substring(7),
        p_claimed_balance: 30000,
        p_screenshot_url: null,
        p_additional_notes: 'Test submission after auth fix - ' + new Date().toISOString()
      };
      
      console.log('Submitting with data:', testData);
      
      const { data: result, error: rpcError } = await supabase.rpc(
        'submit_balance_verification_request',
        testData
      );
      
      if (rpcError) {
        console.error('❌ RPC Error:', rpcError);
        console.log('Error details:', {
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
          code: rpcError.code
        });
        console.log('\n⚠️ The fix may not be working correctly.');
        return;
      }
      
      console.log('✅ RPC Response:', result);
      
      if (result.success) {
        console.log('\n🎉 SUCCESS! Verification request submitted!');
        console.log('Request ID:', result.request_id);
        console.log('Priority:', result.priority);
        console.log('Discrepancy:', result.discrepancy_amount, 'RZC');
        console.log('\n✅ The auth fix is working correctly!');
      } else {
        console.error('\n❌ RPC returned error:', result.error);
        console.log('The function was called but returned an error.');
      }
      
      // Step 3: Check if the request was created
      console.log('\n📋 Step 3: Verifying request was created...');
      const { data: requests, error: fetchError } = await supabase
        .from('balance_verification_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (fetchError) {
        console.error('❌ Error fetching requests:', fetchError);
      } else if (requests && requests.length > 0) {
        console.log('✅ Latest request:', requests[0]);
        console.log('Status:', requests[0].status);
        console.log('Created:', requests[0].created_at);
      }
      
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('🏁 TEST COMPLETE');
      console.log('═══════════════════════════════════════════════════════════════');
      
    } catch (error) {
      console.error('❌ Unexpected error:', error);
    }
  })();
}
