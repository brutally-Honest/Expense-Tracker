import { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../api';
import { reducer, initialState } from '../store/reducer';

const DRAFT_KEY = 'expense_draft_queue';

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* private mode / quota */
  }
}

/**
 * useExpenses — the brain of the app.
 *
 * Responsibilities:
 * 1. Fetch expenses (on mount + whenever filters change)
 * 2. Submit new expenses with optimistic update + rollback on failure
 * 3. Replay any pending drafts from localStorage (handles page-refresh mid-submit)
 * 4. Expose state + actions to components
 *
 * Components just call { submit, setFilter } and read { state }.
 * They know nothing about fetch logic or error recovery.
 */
export function useExpenses() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [categories, setCategories] = useState([]);
  const [summaryByCategory, setSummaryByCategory] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);

  // Tracks whether we've replayed drafts — only do it once on mount
  const draftReplayed = useRef(false);
  const isFirstMetaFetch = useRef(true);

  // ── Fetch ───────────────────────────────────────────────────────────────

  const fetchExpenses = useCallback(async (filters) => {
    dispatch({ type: 'FETCH_START' });
    try {
      const { data } = await api.getExpenses(filters);
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', payload: err.message });
      toast.error(err.message);
    }
  }, []);

  const fetchCategoriesAndSummary = useCallback(async () => {
    if (isFirstMetaFetch.current) setMetaLoading(true);
    try {
      const [catRes, sumRes] = await Promise.all([
        api.getCategories(),
        api.getExpensesSummary(),
      ]);
      setCategories(catRes.data);
      setSummaryByCategory(sumRes.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      if (isFirstMetaFetch.current) {
        setMetaLoading(false);
        isFirstMetaFetch.current = false;
      }
    }
  }, []);

  // Re-fetch whenever filters change
  useEffect(() => {
    fetchExpenses(state.filters);
  }, [state.filters, fetchExpenses]);

  useEffect(() => {
    fetchCategoriesAndSummary();
  }, [fetchCategoriesAndSummary]);

  // ── Draft queue (offline / refresh resilience) ───────────────────────────

  /**
   * If the user submitted an expense but the page refreshed before the
   * response arrived, the draft sits in localStorage. On mount, we replay it.
   *
   * Analogy: like a "send queue" in an email client.
   */
  useEffect(() => {
    if (draftReplayed.current) return;
    draftReplayed.current = true;

    const raw = safeStorageGet(DRAFT_KEY);
    if (!raw) return;

    let draft;
    try {
      draft = JSON.parse(raw);
    } catch {
      safeStorageRemove(DRAFT_KEY);
      return;
    }

    // Replay silently — the server's idempotency window handles duplicates
    api
      .createExpense(draft)
      .then(({ data }) => {
        dispatch({ type: 'SUBMIT_SUCCESS', payload: data });
        safeStorageRemove(DRAFT_KEY);
        fetchExpenses(state.filters);
        fetchCategoriesAndSummary();
      })
      .catch(() => {
        // If replay fails, remove draft to avoid infinite retry loop
        safeStorageRemove(DRAFT_KEY);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit ───────────────────────────────────────────────────────────────

  /**
   * Submit a new expense.
   * 1. Save draft to localStorage (survives refresh)
   * 2. Optimistically prepend to list
   * 3. POST to API
   * 4a. On success: remove draft, re-fetch for authoritative state
   * 4b. On failure: rollback optimistic update, show error
   */
  const submitExpense = useCallback(
    async (formData) => {
      dispatch({ type: 'SUBMIT_START' });
      safeStorageSet(DRAFT_KEY, JSON.stringify(formData));

      try {
        const { data } = await api.createExpense(formData);
        safeStorageRemove(DRAFT_KEY);
        dispatch({ type: 'SUBMIT_SUCCESS', payload: data });
        toast.success('Expense saved');
        // Re-fetch to get server-authoritative list (correct order, no dups)
        fetchExpenses(state.filters);
        fetchCategoriesAndSummary();
        return { ok: true };
      } catch (err) {
        dispatch({ type: 'SUBMIT_ERROR', payload: err.message });
        toast.error(err.message);
        return { ok: false, message: err.message };
      }
    },
    [state.filters, fetchExpenses, fetchCategoriesAndSummary]
  );

  // ── Filters ──────────────────────────────────────────────────────────────

  const setFilter = useCallback((key, value) => {
    dispatch({ type: 'SET_FILTER', key, value });
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────

  // Total is always computed from the current list (server already filtered/sorted)
  const total = state.expenses.reduce(
    (sum, e) => sum + parseFloat(e.amount),
    0
  );

  return {
    state,
    total,
    categories,
    summaryByCategory,
    metaLoading,
    submitExpense,
    setFilter,
  };
}
