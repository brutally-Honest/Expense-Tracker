import { useReducer, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../api';
import { reducer, initialState } from '../store/reducer';

const DRAFT_KEY = 'expense_draft_queue';

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

  // Tracks whether we've replayed drafts — only do it once on mount
  const draftReplayed = useRef(false);

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

  // Re-fetch whenever filters change
  useEffect(() => {
    fetchExpenses(state.filters);
  }, [state.filters, fetchExpenses]);

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

    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;

    let draft;
    try {
      draft = JSON.parse(raw);
    } catch {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }

    // Replay silently — the server's idempotency window handles duplicates
    api
      .createExpense(draft)
      .then(({ data }) => {
        dispatch({ type: 'SUBMIT_SUCCESS', payload: data });
        localStorage.removeItem(DRAFT_KEY);
        fetchExpenses(state.filters);
      })
      .catch(() => {
        // If replay fails, remove draft to avoid infinite retry loop
        localStorage.removeItem(DRAFT_KEY);
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
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));

      try {
        const { data } = await api.createExpense(formData);
        localStorage.removeItem(DRAFT_KEY);
        dispatch({ type: 'SUBMIT_SUCCESS', payload: data });
        toast.success('Expense saved');
        // Re-fetch to get server-authoritative list (correct order, no dups)
        fetchExpenses(state.filters);
        return { ok: true };
      } catch (err) {
        dispatch({ type: 'SUBMIT_ERROR', payload: err.message });
        toast.error(err.message);
        return { ok: false, message: err.message };
      }
    },
    [state.filters, fetchExpenses]
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
    submitExpense,
    setFilter,
  };
}
