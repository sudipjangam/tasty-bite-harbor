const SUPABASE_URL = "https://clmsoetktmvhazctlans.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbXNvZXRrdG12aGF6Y3RsYW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1MTE5NTIsImV4cCI6MjA1NDA4Nzk1Mn0.4j8CLdQn9By5XawbdC4LlWhFumIQT6gqCl2lZnQwQWk";

async function main() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?name=ilike.*Prajakta*&select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json"
    }
  });
  const data = await res.json();
  console.log("Customer:", data);
  
  if (data && data.length > 0) {
    const restaurantId = data[0].restaurant_id;
    const resLoyalty = await fetch(`${SUPABASE_URL}/rest/v1/loyalty_programs?restaurant_id=eq.${restaurantId}&select=*`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
        }
    });
    const loyalty = await resLoyalty.json();
    console.log("Loyalty:", loyalty);

    const resOrders = await fetch(`${SUPABASE_URL}/rest/v1/orders_unified?customer_id=eq.${data[0].id}&select=*`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
        }
    });
    const orders = await resOrders.json();
    console.log("Orders:", orders);
  }
}
main();
