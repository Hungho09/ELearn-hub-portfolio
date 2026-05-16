/**
 * Shared API configuration for backend service proxy routes.
 */

export const API_SERVICE_URL = process.env.API_SERVICE_URL || "http://127.0.0.1:3001";

/** Retry config for backend fetch calls */
export const FETCH_RETRY_COUNT = 3;
export const FETCH_RETRY_BASE_MS = 300;

/** Fetch with retry + exponential backoff for backend service calls */
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
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = baseMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}
