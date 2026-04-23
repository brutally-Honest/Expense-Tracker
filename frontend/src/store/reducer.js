/**
 * App State — managed with useReducer.
 *
 * Analogy: think of this like Redux but without the ceremony.
 * All state transitions are explicit and traceable — no scattered setStates.
 *
 * State shape:
 * {
 *   expenses: Expense[],          ← server-sourced, refreshed on mount and after create
 *   filters: { category, sort },  ← passed to GET /expenses as query params
 *   ui: {
 *     loading: bool,              ← GET in flight
 *     submitting: bool,           ← POST in flight
 *     error: string | null,       ← last error message
 *   }
 * }
 */

export const initialState = {
  expenses: [],
  filters: {
    category: '',
    sort: 'date_desc',
  },
  ui: {
    loading: false,
    submitting: false,
    error: null,
  },
};

export function reducer(state, action) {
  switch (action.type) {
    // ── Fetch lifecycle ─────────────────────────────────────────────────────
    case 'FETCH_START':
      return { ...state, ui: { ...state.ui, loading: true, error: null } };

    case 'FETCH_SUCCESS':
      return {
        ...state,
        expenses: action.payload,
        ui: { ...state.ui, loading: false },
      };

    case 'FETCH_ERROR':
      return {
        ...state,
        ui: { ...state.ui, loading: false, error: action.payload },
      };

    // ── Submit lifecycle ────────────────────────────────────────────────────
    case 'SUBMIT_START':
      return { ...state, ui: { ...state.ui, submitting: true, error: null } };

    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        // Prepend optimistically; will be reconciled on next fetch
        expenses: [action.payload, ...state.expenses],
        ui: { ...state.ui, submitting: false },
      };

    case 'SUBMIT_ERROR':
      return {
        ...state,
        ui: { ...state.ui, submitting: false, error: action.payload },
      };

    // ── Filters ────────────────────────────────────────────────────────────
    case 'SET_FILTER':
      return {
        ...state,
        filters: { ...state.filters, [action.key]: action.value },
      };

    case 'CLEAR_ERROR':
      return { ...state, ui: { ...state.ui, error: null } };

    default:
      return state;
  }
}
