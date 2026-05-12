/**
 * API helper for communicating with the Python FastAPI backend.
 * All requests are proxied through Next.js API routes (/api/python/...)
 * which forward them to the Python backend on port 8001.
 */

const API_PROXY_PREFIX = '/api/python';

/**
 * Build a proxied API URL.
 * Converts /api/auth/login → /api/python/api/auth/login
 * The Next.js proxy route then forwards to Python backend.
 */
export function apiUrl(path: string): string {
  return `${API_PROXY_PREFIX}${path}`;
}

/**
 * Fetch wrapper that automatically:
 * - Routes through the Next.js proxy to the Python backend
 * - Attaches Bearer token if provided
 * - Sets Content-Type to application/json unless body is FormData
 */
export async function apiFetch(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(apiUrl(path), { ...options, headers });
}
