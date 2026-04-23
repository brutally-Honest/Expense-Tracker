import { useState, useEffect } from 'react';
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
    submitExpense,
    setFilter,
  } = useExpenses();
  const { expenses, filters, ui } = state;
  const online = useOnline();

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
            <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-full px-3 py-1 font-medium">
              Offline — changes will sync on reconnect
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
            />

            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Current list (filters applied)</p>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-600">
                  {expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}
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
