// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 BALANCE VERIFICATION SUBMISSION DIAGNOSTIC
// ═══════════════════════════════════════════════════════════════════════════════
// Run this in browser console to diagnose why verification submission is failing

console.log('🔍 Starting Balance Verification Submission Diagnostic...\n');

// Get Supabase client
const supabase = window.supabase || window.supabaseClient;

if (!supabase) {
  console.error('❌ Supabase client not found!');
  console.log('Make sure you are on a page where Supabase is initialized.');
} else {
  console.log('✅ Supabase client found\n');
  
  (async () => {
    try {
      // Step 1: Check current session
      console.log('📋 Step 1: Checking current session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        return;
      }
      
      if (!session) {
        console.error('❌ No active session found!');
        console.log('Please log in with your wallet first.');
        return;
      }
      
      console.log('✅ Active session found');
      console.log('User ID:', session.user.id);
      console.log('JWT Claims:', session.user);
      console.log('User Metadata:', session.user.user_metadata);
      console.log('App Metadata:', session.user.app_metadata);
      console.log('');
      
      // Step 2: Check wallet_users record
      console.log('📋 Step 2: Checking wallet_users record...');
      const { data: profile, error: profileError } = await supabase
        .from('wallet_users')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Profile lookup error:', profileError);
        
        // Try by wallet address if available
        const walletAddress = session.user.user_metadata?.wallet_address;
        if (walletAddress) {
          console.log('🔄 Trying lookup by wallet address:', walletAddress);
          const { data: profileByWallet, error: walletError } = await supabase
            .from('wallet_users')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single();
          
          if (walletError) {
            console.error('❌ Wallet address lookup also failed:', walletError);
          } else {
            console.log('✅ Profile found by wallet address:', profileByWallet);
          }
        }
      } else {
        console.log('✅ Profile found:', profile);
        console.log('Wallet Address:', profile.wallet_address);
        console.log('RZC Balance:', profile.rzc_balance);
        console.log('Balance Verified:', profile.balance_verified);
        console.log('Balance Locked:', profile.balance_locked);
        console.log('');
      }
      
      // Step 3: Test the RPC function directly
      console.log('📋 Step 3: Testing RPC function...');
      console.log('Calling submit_balance_verification_request with test data...');
      
      const testData = {
        p_telegram_username: '@testuser',
        p_old_wallet_address: 'EQTest123456789',
        p_claimed_balance: 25000,
        p_screenshot_url: null,
        p_additional_notes: 'Test submission from diagnostic script'
      };
      
      console.log('Test parameters:', testData);
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'submit_balance_verification_request',
        testData
      );
      
      if (rpcError) {
        console.error('❌ RPC function error:', rpcError);
        console.log('Error details:', {
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
          code: rpcError.code
        });
      } else {
        console.log('✅ RPC function response:', rpcResult);
        
        if (rpcResult.success) {
          console.log('🎉 SUCCESS! Verification request submitted!');
          console.log('Request ID:', rpcResult.request_id);
          console.log('Priority:', rpcResult.priority);
          console.log('Discrepancy:', rpcResult.discrepancy_amount);
        } else {
          console.error('❌ RPC returned error:', rpcResult.error);
        }
      }
      
      console.log('');
      
      // Step 4: Check existing verification requests
      console.log('📋 Step 4: Checking existing verification requests...');
      const { data: requests, error: requestsError } = await supabase
        .from('balance_verification_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (requestsError) {
        console.error('❌ Error fetching requests:', requestsError);
      } else {
        console.log('✅ Recent verification requests:', requests);
        console.log('Total requests found:', requests.length);
      }
      
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('🏁 DIAGNOSTIC COMPLETE');
      console.log('═══════════════════════════════════════════════════════════════');
      
    } catch (error) {
      console.error('❌ Unexpected error during diagnostic:', error);
    }
  })();
}
