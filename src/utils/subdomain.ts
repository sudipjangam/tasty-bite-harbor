/**
 * Subdomain and portal detection utilities
 * Supports production multi-domain (admin.swadeshisolutions.co.in)
 * and development query param simulation (?portal=admin or ?admin=true)
 */

export function isAdminSubdomain(): boolean {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname.toLowerCase();

  // Check hostname prefix (e.g., admin.swadeshisolutions.co.in, admin.localhost)
  if (hostname.startsWith("admin.") || hostname === "admin.localhost") {
    return true;
  }

  // Check URL query parameters for development / testing
  const urlParams = new URLSearchParams(window.location.search);
  if (
    urlParams.get("portal") === "admin" ||
    urlParams.get("admin") === "true"
  ) {
    return true;
  }

  // Check session storage toggle for dev testing
  try {
    if (sessionStorage.getItem("dev_force_admin_portal") === "true") {
      return true;
    }
  } catch {}

  return false;
}

export function getAdminPortalUrl(path: string = "/platform"): string {
  if (typeof window === "undefined") return path;

  const currentHost = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : "";

  // If already on admin subdomain
  if (isAdminSubdomain()) {
    return path;
  }

  // If local development
  if (currentHost === "localhost" || currentHost === "127.0.0.1") {
    return `${path}${path.includes("?") ? "&" : "?"}portal=admin`;
  }

  // In production: swadeshisolutions.co.in -> admin.swadeshisolutions.co.in
  const baseDomain = currentHost.replace(/^(app|pos|www)\./, "");
  return `${protocol}//admin.${baseDomain}${port}${path}`;
}

export function getMainAppUrl(path: string = "/"): string {
  if (typeof window === "undefined") return path;

  const currentHost = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : "";

  // If local development with query param
  if (currentHost === "localhost" || currentHost === "127.0.0.1") {
    return path;
  }

  // In production: admin.swadeshisolutions.co.in -> swadeshisolutions.co.in
  const mainHost = currentHost.replace(/^admin\./, "");
  return `${protocol}//${mainHost}${port}${path}`;
}
