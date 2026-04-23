import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { categoryLabelClass } from './ExpenseSummary';

/**
 * ExpenseTable
 *
 * Pure display component. Gets expenses[] from parent, renders them.
 * Handles empty + loading states inline.
 */
export function ExpenseTable({
  expenses,
  loading,
  categories = [],
  onEdit,
  onDelete,
  disabled = false,
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [expensePendingConfirm, setExpensePendingConfirm] = useState(null);

  useEffect(() => {
    if (!expensePendingConfirm) return undefined;
    function onKeyDown(e) {
      if (e.key === 'Escape') setExpensePendingConfirm(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expensePendingConfirm]);

  useEffect(() => {
    if (!expensePendingConfirm) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expensePendingConfirm]);

  async function confirmDelete() {
    if (!expensePendingConfirm) return;
    const id = expensePendingConfirm.id;
    setPendingDeleteId(id);
    try {
      const result = await onDelete(id);
      if (result?.ok) setExpensePendingConfirm(null);
    } finally {
      setPendingDeleteId(null);
    }
  }

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

  const modal =
    expensePendingConfirm &&
    createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
        role="presentation"
      >
        <button
          type="button"
          className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px]"
          aria-label="Close dialog"
          onClick={() => setExpensePendingConfirm(null)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-expense-title"
          aria-describedby="delete-expense-desc"
          className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl"
        >
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <TrashIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 id="delete-expense-title" className="text-base font-semibold text-gray-900">
                  Delete expense?
                </h3>
                <p id="delete-expense-desc" className="mt-1 text-sm text-gray-500 leading-relaxed">
                  This removes the entry permanently. You can’t undo this action.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3 px-6 py-4 bg-gray-50/80 rounded-b-xl">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Amount</dt>
              <dd className="font-mono font-medium text-gray-900 text-right">
                ₹
                {parseFloat(expensePendingConfirm.amount).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </dd>
              <dt className="text-gray-500">Category</dt>
              <dd className="text-right text-gray-900">{expensePendingConfirm.category}</dd>
              <dt className="text-gray-500">Description</dt>
              <dd className="text-right text-gray-900 break-words">
                {expensePendingConfirm.description}
              </dd>
              <dt className="text-gray-500">Date</dt>
              <dd className="text-right text-gray-700">{formatDate(expensePendingConfirm.date)}</dd>
            </dl>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                disabled={!!pendingDeleteId}
                onClick={() => setExpensePendingConfirm(null)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!pendingDeleteId}
                onClick={() => void confirmDelete()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {pendingDeleteId ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
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
              <th className="pb-2 pl-3 font-medium text-gray-500 text-xs uppercase tracking-wider text-right w-[1%] whitespace-nowrap">
                Actions
              </th>
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
                <td className="py-3 pl-3 text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(expense)}
                      disabled={disabled || !!pendingDeleteId || loading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50 hover:border-blue-200 disabled:pointer-events-none disabled:opacity-40 transition-colors"
                      aria-label={`Edit expense: ${expense.description}`}
                    >
                      <PencilIcon className="h-4 w-4 shrink-0" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpensePendingConfirm(expense)}
                      disabled={disabled || !!pendingDeleteId || loading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50 hover:border-red-200 disabled:pointer-events-none disabled:opacity-40 transition-colors"
                      aria-label={`Delete expense: ${expense.description}`}
                    >
                      <TrashIcon className="h-4 w-4 shrink-0" />
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal}
    </>
  );
}

function PencilIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  );
}

function TrashIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.038-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
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
