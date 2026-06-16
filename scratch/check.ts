import { createClient } from "npm:@supabase/supabase-js";
import { config } from "npm:dotenv";

config();

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data, error } = await supabase
  .from("customers")
  .select("*")
  .ilike("phone", "%9653484966%");

console.log("Customers with 9653484966:", data);

const { data: data2, error: error2 } = await supabase
  .from("orders")
  .select("id, customer_name, customer_phone")
  .ilike("customer_phone", "%9653484966%");

console.log("Orders with 9653484966:", data2);
