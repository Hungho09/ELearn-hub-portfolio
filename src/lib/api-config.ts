/**
 * Shared API configuration for backend service proxy calls.
 */

export const API_SERVICE_URL = process.env.API_SERVICE_URL || "http://127.0.0.1:3001";

/** Retry config for backend fetch calls */
export const FETCH_RETRY_COUNT = 5;
export const FETCH_RETRY_BASE_MS = 1000;

/**
 * Check if an error is a connection-level error (backend down / restarting).
 * These errors should be retried more aggressively than HTTP errors.
 */
function isConnectionError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("econnrefused") ||
      msg.includes("eaddrinuse") ||
      msg.includes("enotfound") ||
      msg.includes("econnreset") ||
      msg.includes("socket hang up") ||
      msg.includes("fetch failed") ||
      msg.includes("network error") ||
      msg.includes("connect")
    );
  }
  return false;
}

/** Fetch with retry + exponential backoff for backend service calls.
 *
 * - Connection errors (backend down, EADDRINUSE, etc.): retry with backoff
 * - 5xx HTTP errors: retry with backoff
 * - 4xx HTTP errors: return immediately (client error, retrying won't help)
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = FETCH_RETRY_COUNT,
  baseMs = FETCH_RETRY_BASE_MS
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        // Prevent Next.js from caching error responses
        cache: "no-store",
      });
      // 5xx errors are retryable; 4xx are not
      if (res.status >= 500 && attempt < retries) {
        lastError = new Error(`Backend returned ${res.status}`);
        const delay = baseMs * Math.pow(2, attempt);
        console.warn(`[api-config] Backend ${res.status}, retry ${attempt + 1}/${retries} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        // Connection errors get a slightly longer initial delay
        // since the backend may be restarting or loading models
        const isConn = isConnectionError(err);
        const multiplier = isConn ? 1.5 : 1;
        const delay = baseMs * Math.pow(2, attempt) * multiplier;
        console.warn(
          `[api-config] ${isConn ? "Connection error" : "Fetch error"} (attempt ${attempt + 1}/${retries}), retrying in ${Math.round(delay)}ms:`,
          err instanceof Error ? err.message : String(err)
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}
