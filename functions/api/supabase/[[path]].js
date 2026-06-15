export async function onRequest(context) {
  const { request, params } = context;
  
  // params.path is an array of path segments matched by [[path]]
  const path = params.path ? params.path.join('/') : '';
  
  // The target Supabase project URL
  const supabaseUrl = 'https://clmsoetktmvhazctlans.supabase.co';
  
  // Construct the new URL
  const originalUrl = new URL(request.url);
  const targetUrl = new URL(`/${path}${originalUrl.search}`, supabaseUrl);

  // Clone the request to modify it
  const newRequest = new Request(targetUrl, request);

  // Fetch the request and return the response
  return fetch(newRequest);
}
