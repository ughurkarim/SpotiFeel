import { demoApiRequest, isDemoApiRequest, isDemoMode } from "./demo.js";

let csrfToken = "";

export function setCsrfToken(token) {
  csrfToken = typeof token === "string" ? token : "";
}

export async function apiRequest(url, options = {}) {
  if (isDemoMode() && isDemoApiRequest(url)) {
    return demoApiRequest(url, options);
  }

  const requestOptions = { ...options };
  const method = (requestOptions.method || "GET").toUpperCase();
  const headers = new Headers(requestOptions.headers || {});
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  requestOptions.headers = headers;
  const response = await fetch(url, requestOptions);
  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }
  return { response, data };
}
