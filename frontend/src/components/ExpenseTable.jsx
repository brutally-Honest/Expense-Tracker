import { categoryLabelClass } from './ExpenseSummary';

/**
 * ExpenseTable
 *
 * Pure display component. Gets expenses[] from parent, renders them.
 * Handles empty + loading states inline.
 */
export function ExpenseTable({ expenses, loading, categories = [] }) {
  if (loading && expenses.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-10 text-center">
        Loading…
      </div>
    );
  }

  if (!loading && expenses.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-10 text-center">
        No expenses yet. Add one above.
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-start justify-end pt-1 pr-1 pointer-events-none">
          <span className="text-xs font-medium text-gray-500 bg-white/90 border border-gray-200 rounded px-2 py-1 shadow-sm">
            Refreshing…
          </span>
        </div>
      ) : null}
      <table className={`w-full text-sm ${loading ? 'opacity-60' : ''}`}>
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="pb-2 font-medium text-gray-500 text-xs uppercase tracking-wider">Date</th>
            <th className="pb-2 font-medium text-gray-500 text-xs uppercase tracking-wider">Category</th>
            <th className="pb-2 font-medium text-gray-500 text-xs uppercase tracking-wider">Description</th>
            <th className="pb-2 font-medium text-gray-500 text-xs uppercase tracking-wider text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {expenses.map((expense) => (
            <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                {formatDate(expense.date)}
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`inline-block text-xs rounded-md px-2 py-0.5 font-medium ${categoryLabelClass(
                    expense.category,
                    categories
                  )}`}
                >
                  {expense.category}
                </span>
              </td>
              <td className="py-3 pr-4 text-gray-700">{expense.description}</td>
              <td className="py-3 text-right font-mono font-medium text-gray-900 whitespace-nowrap">
                ₹{parseFloat(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** YYYY-MM-DD → "12 Apr 2025" */
function formatDate(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
