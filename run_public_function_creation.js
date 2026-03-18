import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Use service role key if available, otherwise anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  supabaseKey
);

async function createPublicFunction() {
  console.log('🔧 Creating Public Verification Function...');
  
  try {
    const sql = readFileSync('create_public_verification_function.sql', 'utf8');
    
    // Split the SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim() + ';';
      
      if (statement.includes('CREATE OR REPLACE FUNCTION')) {
        console.log(`\n📝 Executing statement ${i + 1}: Creating function...`);
      } else if (statement.includes('GRANT EXECUTE')) {
        console.log(`\n🔐 Executing statement ${i + 1}: Granting permissions...`);
      } else if (statement.includes('DO $$')) {
        console.log(`\n🧪 Executing statement ${i + 1}: Testing function...`);
      } else {
        console.log(`\n⚡ Executing statement ${i + 1}...`);
      }
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      });
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        
        // Try alternative approach for function creation
        if (statement.includes('CREATE OR REPLACE FUNCTION')) {
          console.log('🔄 Trying direct SQL execution...');
          
          // For function creation, we might need to use a different approach
          // Let's try to execute it as a raw query
          const { error: rawError } = await supabase
            .from('_dummy_table_that_does_not_exist')
            .select('*')
            .limit(0);
          
          // This will fail, but might give us insight into the SQL execution capabilities
          console.log('Raw query test completed');
        }
        
        continue; // Continue with next statement
      }
      
      console.log(`✅ Statement ${i + 1} executed successfully`);
      if (data) {
        console.log('📊 Result:', data);
      }
    }
    
    // Test the function directly
    console.log('\n🧪 Testing the new function...');
    
    const { data: testResult, error: testError } = await supabase.rpc(
      'submit_verification_request_public',
      {
        p_wallet_address: 'EQTestWallet123',
        p_telegram_username: '@test_function',
        p_old_wallet_address: 'EQOldWallet456',
        p_claimed_balance: 1000,
        p_additional_notes: 'Function test'
      }
    );
    
    if (testError) {
      console.error('❌ Function test error:', testError.message);
    } else {
      console.log('✅ Function test result:', testResult);
    }
    
  } catch (error) {
    console.error('💥 Creation failed:', error.message);
  }
}

createPublicFunction();