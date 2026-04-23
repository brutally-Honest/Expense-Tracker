/**
 * ExpenseSummary
 *
 * Shows the total of the currently visible expense list.
 * "Currently visible" means after server-side filters are applied —
 * this component just formats whatever total the hook computed.
 *
 * Total is computed in the hook (not here) so it stays in sync
 * with the server-authoritative list, not any stale local copy.
 */
export function ExpenseSummary({ total, count }) {
  const formatted = total.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex items-baseline justify-between border-t border-gray-200 pt-4 mt-2">
      <span className="text-xs text-gray-500">
        {count} {count === 1 ? 'entry' : 'entries'}
      </span>
      <div className="text-right">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-2">Total</span>
        <span className="text-lg font-semibold text-gray-900 font-mono">₹{formatted}</span>
      </div>
    </div>
  );
}
