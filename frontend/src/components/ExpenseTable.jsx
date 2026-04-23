const CATEGORY_BADGE = {
  Food: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80',
  Transport: 'bg-sky-100 text-sky-900 ring-1 ring-sky-200/80',
  Utilities: 'bg-violet-100 text-violet-900 ring-1 ring-violet-200/80',
  Shopping: 'bg-rose-100 text-rose-900 ring-1 ring-rose-200/80',
  Health: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80',
  Entertainment: 'bg-purple-100 text-purple-900 ring-1 ring-purple-200/80',
  Other: 'bg-slate-100 text-slate-800 ring-1 ring-slate-200/80',
};

function categoryBadgeClass(category) {
  return CATEGORY_BADGE[category] ?? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200/80';
}

/**
 * ExpenseTable
 *
 * Pure display component. Gets expenses[] from parent, renders them.
 * Handles empty + loading states inline.
 */
export function ExpenseTable({ expenses, loading }) {
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
                  className={`inline-block text-xs rounded-md px-2 py-0.5 font-medium ${categoryBadgeClass(expense.category)}`}
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
