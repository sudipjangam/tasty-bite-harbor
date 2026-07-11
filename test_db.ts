import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const { data, error } = await supa
  .from('shared_bills')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(3);

if (error) {
  console.error('Error:', error.message);
} else {
  console.log(JSON.stringify(data, null, 2));
}
