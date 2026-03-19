import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supa = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supa.from('shared_bills').select('*').order('created_at', { ascending: false }).limit(3).then(d => console.log(JSON.stringify(d.data, null, 2)));
