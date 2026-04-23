import { useState, useEffect, useCallback } from 'react';
import { useExpenses } from './hooks/useExpenses';
import { ExpenseForm } from './components/ExpenseForm';
import { FilterBar } from './components/FilterBar';
import { ExpenseTable } from './components/ExpenseTable';
import { ExpenseSummary } from './components/ExpenseSummary';

/**
 * App
 *
 * Thin orchestration layer. Only job: connect the hook to the components.
 * No business logic lives here — that's all in useExpenses.
 *
 * Layout:
 *   [header]
 *   [ExpenseForm]   ← left col on desktop
 *   [Summary card]  [List card: Filter + table + list subtotal]  ← right, stacked
 */
export default function App() {
  const {
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
  } = useExpenses();
  const { expenses, filters, ui, listMeta, pagination } = state;
  const online = useOnline();

  const [editingExpense, setEditingExpense] = useState(null);

  const handleCancelEdit = useCallback(() => setEditingExpense(null), []);

  const handleEdit = useCallback((row) => {
    setEditingExpense(row);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleUpdate = useCallback(
    (id, fields) => updateExpense(id, fields),
    [updateExpense]
  );

  const handleDeleteExpense = useCallback(
    async (id) => {
      const result = await deleteExpense(id);
      if (result?.ok) {
        setEditingExpense((prev) => (prev?.id === id ? null : prev));
      }
      return result;
    },
    [deleteExpense]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Expense Tracker</h1>
            <p className="text-xs text-gray-400">Personal finance, simplified</p>
          </div>
          {!online && (
            <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-full px-3 py-1 font-medium max-w-[20rem] text-right leading-snug">
              Offline — cannot reach the server.
              {hasPendingDraft
                ? ' Unsent expense will retry when you are back online.'
                : ' List and totals refresh when you are back online.'}
            </span>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[360px_1fr] gap-6 items-start">
        {/* Left: form */}
        <div>
          <ExpenseForm
            categories={categories}
            onSubmit={submitExpense}
            submitting={ui.submitting}
            editingExpense={editingExpense}
            onUpdate={handleUpdate}
            onCancelEdit={handleCancelEdit}
          />
        </div>

        {/* Right: summary (top) + list (bottom), separate cards */}
        <div className="space-y-6">
          <section
            className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm"
            aria-labelledby="summary-heading"
          >
            <ExpenseSummary
              byCategory={summaryByCategory}
              summaryLoading={metaLoading}
              categories={categories}
            />
          </section>

          <section
            className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4"
            aria-labelledby="expenses-heading"
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2
                id="expenses-heading"
                className="text-sm font-semibold text-gray-500 uppercase tracking-widest"
              >
                Expenses
              </h2>
              <FilterBar
                categories={categories}
                filters={filters}
                onFilterChange={setFilter}
              />
            </div>

            <ExpenseTable
              expenses={expenses}
              loading={ui.loading}
              categories={categories}
              onEdit={handleEdit}
              onDelete={handleDeleteExpense}
              disabled={!online || !!ui.submitting}
            />

            <PaginationControls
              listMeta={listMeta}
              pagination={pagination}
              disabled={ui.loading || !online}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />

            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">
                Filtered total (all matching entries, not just this page)
              </p>
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <span className="text-sm text-gray-600">
                  {listMeta.total === 0 ? (
                    'No matching entries'
                  ) : (
                    <>
                      Showing{' '}
                      {(pagination.page - 1) * pagination.limit + 1}
                      –
                      {Math.min(pagination.page * pagination.limit, listMeta.total)} of {listMeta.total}{' '}
                      {listMeta.total === 1 ? 'entry' : 'entries'}
                    </>
                  )}
                </span>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-2">Total</span>
                  <span className="text-lg font-semibold text-gray-900 font-mono">
                    ₹
                    {total.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/**
 * useOnline — subscribes to browser online/offline events.
 * Returns false the moment connectivity is lost.
 */
function PaginationControls({
  listMeta,
  pagination,
  disabled,
  onPageChange,
  onLimitChange,
}) {
  const { total, totalPages } = listMeta;
  const { page, limit } = pagination;
  const canPrev = total > 0 && page > 1;
  const canNext = total > 0 && page < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <label htmlFor="page-size" className="font-medium text-gray-500">
          Rows per page
        </label>
        <select
          id="page-size"
          value={limit}
          disabled={disabled}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white disabled:opacity-50"
        >
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || !canPrev}
          onClick={() => onPageChange(page - 1)}
          className="text-xs font-medium px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-xs text-gray-500 tabular-nums">
          Page {total === 0 ? 0 : page} / {total === 0 ? 0 : totalPages}
        </span>
        <button
          type="button"
          disabled={disabled || !canNext}
          onClick={() => onPageChange(page + 1)}
          className="text-xs font-medium px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return online;
}
