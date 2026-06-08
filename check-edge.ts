import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
// Check if the edge function works
supabase.functions.invoke('send-order-update', {
  body: {
    record: { id: "test", status: "completed", customer_phone: "1234567890", restaurant_id: "test" },
    old_record: { status: "pending" }
  }
}).then(res => console.log("Invoke Res:", res.data, res.error))
  .catch(console.error);
