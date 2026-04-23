/**
 * App State — managed with useReducer.
 *
 * Analogy: think of this like Redux but without the ceremony.
 * All state transitions are explicit and traceable — no scattered setStates.
 *
 * State shape:
 * {
 *   expenses: Expense[],          ← server-sourced, paginated slice
 *   listMeta: { page, limit, total, totalPages, totalAmount }  ← from GET /expenses
 *   filters: { category, sort },
 *   pagination: { page, limit },
 *   ui: { loading, submitting, error }
 * }
 */

export const initialState = {
  expenses: [],
  listMeta: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    totalAmount: '0.00',
  },
  filters: {
    category: '',
    sort: 'date_desc',
  },
  pagination: {
    page: 1,
    limit: 10,
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

    case 'FETCH_SUCCESS': {
      const { data, meta } = action.payload;
      const paginationSame =
        state.pagination.page === meta.page &&
        state.pagination.limit === meta.limit;
      return {
        ...state,
        expenses: data,
        listMeta: meta,
        // Keep same object reference when server echoes the same page/limit — avoids a
        // useEffect([state.pagination]) loop (spread always created a new object before).
        pagination: paginationSame
          ? state.pagination
          : { ...state.pagination, page: meta.page, limit: meta.limit },
        ui: { ...state.ui, loading: false },
      };
    }

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
        pagination: { ...state.pagination, page: 1 },
      };

    case 'SET_PAGE':
      return {
        ...state,
        pagination: { ...state.pagination, page: action.payload },
      };

    case 'SET_LIMIT':
      return {
        ...state,
        pagination: { ...state.pagination, limit: action.payload, page: 1 },
      };

    default:
      return state;
  }
}
