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
 *   [ExpenseForm]          ← left col on desktop
 *   [FilterBar + Table]    ← right col on desktop
 *   [ExpenseSummary]
 */
export default function App() {
  const { state, total, submitExpense, setFilter } = useExpenses();
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
          <ExpenseForm onSubmit={submitExpense} submitting={ui.submitting} />
        </div>

        {/* Right: list */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
              Expenses
            </h2>
            <FilterBar filters={filters} onFilterChange={setFilter} />
          </div>

          <ExpenseTable expenses={expenses} loading={ui.loading} />

          <ExpenseSummary total={total} count={expenses.length} />
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
