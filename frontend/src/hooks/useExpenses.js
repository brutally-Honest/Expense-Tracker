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
 * 2. Submit expenses: persist draft → POST → on success clear draft and refetch (list is server-authoritative)
 * 3. Replay pending draft from localStorage after refresh; on `online`, refetch + retry draft (assignment: unreliable network / retries)
 * 4. Expose state + actions to components
 */
export function useExpenses() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [categories, setCategories] = useState([]);
  const [summaryByCategory, setSummaryByCategory] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [hasPendingDraft, setHasPendingDraft] = useState(() => !!safeStorageGet(DRAFT_KEY));

  const filtersRef = useRef(state.filters);
  filtersRef.current = state.filters;

  const paginationRef = useRef(state.pagination);
  paginationRef.current = state.pagination;

  // Avoid duplicate mount replay (e.g. React StrictMode double-invoke)
  const draftReplayed = useRef(false);
  const isFirstMetaFetch = useRef(true);

  // ── Fetch ───────────────────────────────────────────────────────────────

  const fetchExpenses = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const filters = filtersRef.current;
      const { page, limit } = paginationRef.current;
      const { data, meta } = await api.getExpenses({
        ...filters,
        page,
        limit,
      });
      dispatch({ type: 'FETCH_SUCCESS', payload: { data, meta } });
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

  // Re-fetch whenever filters or pagination change (primitive deps — avoid object identity churn)
  useEffect(() => {
    void fetchExpenses();
  }, [
    state.filters.category,
    state.filters.sort,
    state.pagination.page,
    state.pagination.limit,
    fetchExpenses,
  ]);

  useEffect(() => {
    fetchCategoriesAndSummary();
  }, [fetchCategoriesAndSummary]);

  // ── Draft queue (refresh + reconnect; assignment: retries / unreliable network) ──

  const replayPendingDraft = useCallback(async () => {
    const raw = safeStorageGet(DRAFT_KEY);
    if (!raw) {
      setHasPendingDraft(false);
      return;
    }

    let draft;
    try {
      draft = JSON.parse(raw);
    } catch {
      safeStorageRemove(DRAFT_KEY);
      setHasPendingDraft(false);
      toast.error('Could not read saved expense. Discarded invalid draft.');
      return;
    }

    setHasPendingDraft(true);

    try {
      const { data } = await api.createExpense(draft);
      dispatch({ type: 'SUBMIT_SUCCESS', payload: data });
      safeStorageRemove(DRAFT_KEY);
      setHasPendingDraft(false);
      toast.success('Queued expense saved');
      await fetchExpenses();
      await fetchCategoriesAndSummary();
    } catch (err) {
      const msg = err?.message || 'Could not save queued expense';
      toast.error(msg);
      // Keep draft for next load or `online` retry (no silent drop)
    }
  }, [fetchExpenses, fetchCategoriesAndSummary]);

  useEffect(() => {
    if (draftReplayed.current) return;
    draftReplayed.current = true;
    void replayPendingDraft();
  }, [replayPendingDraft]);

  useEffect(() => {
    function handleOnline() {
      void fetchExpenses();
      void fetchCategoriesAndSummary();
      void replayPendingDraft();
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchExpenses, fetchCategoriesAndSummary, replayPendingDraft]);

  // ── Submit ───────────────────────────────────────────────────────────────

  /**
   * Submit a new expense: write draft (survives refresh), POST, then clear draft + refetch on success.
   * On failure the draft stays so refresh/`online` can retry (server idempotency covers duplicates).
   */
  const submitExpense = useCallback(
    async (formData) => {
      dispatch({ type: 'SUBMIT_START' });
      safeStorageSet(DRAFT_KEY, JSON.stringify(formData));
      setHasPendingDraft(true);

      try {
        const { data } = await api.createExpense(formData);
        safeStorageRemove(DRAFT_KEY);
        setHasPendingDraft(false);
        dispatch({ type: 'SUBMIT_SUCCESS', payload: data });
        toast.success('Expense saved');
        await fetchExpenses();
        await fetchCategoriesAndSummary();
        return { ok: true };
      } catch (err) {
        dispatch({ type: 'SUBMIT_ERROR', payload: err.message });
        toast.error(err.message);
        return { ok: false, message: err.message };
      }
    },
    [fetchExpenses, fetchCategoriesAndSummary]
  );

  const updateExpense = useCallback(
    async (id, formData) => {
      try {
        await api.updateExpense(id, formData);
        toast.success('Expense updated');
        await fetchExpenses();
        await fetchCategoriesAndSummary();
        return { ok: true };
      } catch (err) {
        const msg = err?.message || 'Could not update expense';
        toast.error(msg);
        return { ok: false, message: msg, code: err?.code };
      }
    },
    [fetchExpenses, fetchCategoriesAndSummary]
  );

  const deleteExpense = useCallback(
    async (id) => {
      try {
        await api.deleteExpense(id);
        toast.success('Expense deleted');
        await fetchExpenses();
        await fetchCategoriesAndSummary();
        return { ok: true };
      } catch (err) {
        const msg = err?.message || 'Could not delete expense';
        toast.error(msg);
        return { ok: false, message: msg };
      }
    },
    [fetchExpenses, fetchCategoriesAndSummary]
  );

  // ── Filters ──────────────────────────────────────────────────────────────

  const setFilter = useCallback((key, value) => {
    dispatch({ type: 'SET_FILTER', key, value });
  }, []);

  const setPage = useCallback((page) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  }, []);

  const setLimit = useCallback((limit) => {
    dispatch({ type: 'SET_LIMIT', payload: limit });
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────

  const total = parseFloat(state.listMeta?.totalAmount ?? '0');

  return {
    state,
    total,
    categories,
    summaryByCategory,
    metaLoading,
    hasPendingDraft,
    submitExpense,
    updateExpense,
    deleteExpense,
    setFilter,
    setPage,
    setLimit,
  };
}
