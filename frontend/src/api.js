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

/** Long enough for cold starts (e.g. free Render) without hanging forever. */
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

  const raw = await res.text();
  let body = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = {};
    }
  } else {
    body = {};
  }

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
  /** @returns {Promise<{ data: string[] }>} */
  getCategories() {
    return request('/categories');
  },

  /** @returns {Promise<{ data: { category: string, count: number, amount: string }[] }>} */
  getExpensesSummary() {
    return request('/expenses/summary');
  },

  /**
   * @param {{ category?: string, sort?: string, page?: number, limit?: number }} params
   */
  getExpenses(params = {}) {
    const entries = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ''
    );
    const qs = new URLSearchParams(Object.fromEntries(entries)).toString();
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

  /**
   * @param {string} id
   * @param {{ amount: string, category: string, description: string, date: string }} payload
   */
  updateExpense(id, payload) {
    return request(`/expenses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /** @param {string} id */
  deleteExpense(id) {
    return request(`/expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
