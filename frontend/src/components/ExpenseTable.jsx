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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
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
                <span className="inline-block bg-gray-100 text-gray-600 text-xs rounded px-2 py-0.5 font-medium">
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
