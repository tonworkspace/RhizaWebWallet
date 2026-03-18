// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 TEST ALL AUTHENTICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🧪 Testing All Authentication Functions...');

async function testAllAuthFunctions() {
  try {
    console.log('🔍 Step 1: Check User Authentication');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ User not authenticated - please log in first');
      return;
    }
    
    console.log('✅ User authenticated:', user.id);

    console.log('\n🔍 Step 2: Test get_user_balance_status');
    const { data: balanceResult, error: balanceError } = await supabase.rpc('get_user_balance_status');
    
    if (balanceError) {
      console.error('❌ get_user_balance_status failed:', balanceError.message);
    } else {
      console.log('✅ get_user_balance_status success:', balanceResult?.success);
    }

    console.log('\n🔍 Step 3: Test get_user_verification_status');
    const { data: verificationResult, error: verificationError } = await supabase.rpc('get_user_verification_status');
    
    if (verificationError) {
      console.error('❌ get_user_verification_status failed:', verificationError.message);
    } else {
      console.log('✅ get_user_verification_status success:', verificationResult?.success);
    }