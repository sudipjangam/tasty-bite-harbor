import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const fileContent = Buffer.from('hello world');
  
  // Try authenticating as the user 
  // No, let's just do anonymous first
  console.log("Attempting anonymous upload...");
  let res = await supabase.storage
    .from('images')
    .upload('test-file-' + Date.now() + '.txt', fileContent, {
      contentType: 'text/plain'
    });
  console.log('Anonymous Upload Error:', res.error);

  console.log("Attempting authenticated upload using a dummy user...");
  // We can't easily fetch the actual user, but we know the UI is using an authenticated user.
  // We just want to check if the RLS still throws "new row violates row-level security policy".
}

test();
