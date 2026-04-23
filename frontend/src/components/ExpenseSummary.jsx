/**
 * ExpenseSummary
 *
 * Server totals by category (GET /api/expenses/summary). Filtered list subtotal lives in `App`.
 * `categoryLabelClass` is shared with `ExpenseTable` for consistent badges vs GET /api/categories.
 */
export function ExpenseSummary({ byCategory = [], summaryLoading, categories = [] }) {
  const globalTotalPaise = byCategory.reduce(
    (sum, row) => sum + Math.round(parseFloat(row.amount) * 100),
    0
  );
  const globalFormatted = (globalTotalPaise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div>
      <h2
        id="summary-heading"
        className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1"
      >
        Summary
      </h2>
      <p className="text-xs text-gray-500 mb-4">Totals across all expenses, by category</p>
      {summaryLoading ? (
        <p className="text-sm text-gray-500">Loading summary…</p>
      ) : byCategory.length === 0 ? (
        <p className="text-sm text-gray-500">No expenses yet</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 font-medium text-gray-600">Category</th>
                <th className="px-3 py-2 font-medium text-gray-600 text-right w-20">#</th>
                <th className="px-3 py-2 font-medium text-gray-600 text-right w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.map((row) => (
                <tr key={row.category} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2 text-gray-900">
                    <span
                      className={`inline-block text-xs rounded-md px-2 py-0.5 font-medium ${categoryLabelClass(row.category, categories)}`}
                    >
                      {row.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600 font-mono tabular-nums">
                    {row.count}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-900">
                    ₹
                    {parseFloat(row.amount).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
            {byCategory.length > 0 ? (
              <tfoot>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-gray-800 font-medium">All categories</th>
                  <th className="px-3 py-2 text-right text-gray-600 font-mono font-medium">
                    {byCategory.reduce((n, r) => n + r.count, 0)}
                  </th>
                  <th className="px-3 py-2 text-right font-mono text-gray-900">₹{globalFormatted}</th>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
    </div>
  );
}

/** Same palette as table row badges: known + in API map, known + only in API, or unknown. */
const CATEGORY_BADGE = {
  Food: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80',
  Transport: 'bg-sky-100 text-sky-900 ring-1 ring-sky-200/80',
  Utilities: 'bg-violet-100 text-violet-900 ring-1 ring-violet-200/80',
  Shopping: 'bg-rose-100 text-rose-900 ring-1 ring-rose-200/80',
  Health: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80',
  Entertainment: 'bg-purple-100 text-purple-900 ring-1 ring-purple-200/80',
  Other: 'bg-slate-100 text-slate-800 ring-1 ring-slate-200/80',
};

const DEFAULT_UNKNOWN_FROM_BACKEND =
  'bg-zinc-200 text-zinc-900 ring-1 ring-zinc-300/80';
const DEFAULT_KNOWN_NO_MAP =
  'bg-slate-100 text-slate-800 ring-1 ring-slate-200/80';

export function categoryLabelClass(category, allowedFromApi) {
  const list = Array.isArray(allowedFromApi) ? allowedFromApi : [];
  if (list.length > 0 && !list.includes(category)) {
    return DEFAULT_UNKNOWN_FROM_BACKEND;
  }
  return CATEGORY_BADGE[category] ?? DEFAULT_KNOWN_NO_MAP;
}
