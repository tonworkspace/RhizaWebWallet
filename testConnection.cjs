require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.VITE_SUPABASE_URL.replace(/"/g, '');
const key = process.env.VITE_SUPABASE_ANON_KEY.replace(/"/g, '');

const supabase = createClient(url, key);

async function test() {
    try {
        const { data, error } = await supabase.from('wallet_notifications').select('id', { count: 'exact', head: true });
        console.log("Success:", { data, error });
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}
test();
