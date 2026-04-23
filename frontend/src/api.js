/**
 * API Client
 *
 * All network calls go through here. This means:
 * - One place to change the base URL (dev proxy vs prod Render URL)
 * - One place to add auth headers later
 * - Consistent error shape thrown upward
 *
 * VITE_API_URL is empty in dev (so we use the Vite proxy at /api).
 * In prod (Vercel), set VITE_API_URL=https://your-app.onrender.com
 */

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

async function request(path, options = {}) {
  const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...fetchOptions,
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timedOut = new Error('Request timed out. Please try again.');
      timedOut.name = 'TimeoutError';
      throw timedOut;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const body = await res.json();

  if (!res.ok) {
    // Throw a structured error so callers can inspect code/details
    const err = new Error(body?.error?.message || 'Request failed');
    err.code = body?.error?.code;
    err.details = body?.error?.details;
    err.status = res.status;
    throw err;
  }

  return body;
}

export const api = {
  /**
   * @param {{ category?: string, sort?: string }} params
   */
  getExpenses(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString();
    return request(`/expenses${qs ? `?${qs}` : ''}`);
  },

  /**
   * @param {{ amount: string, category: string, description: string, date: string }} payload
   */
  createExpense(payload) {
    return request('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
