import { useMemo, useState } from 'react';
import { FILTER_SELECT_STYLE, filterSelectClassName } from './FilterBar';

const CATEGORIES = ['Food', 'Transport', 'Utilities', 'Shopping', 'Health', 'Entertainment', 'Other'];

/** Mirrors backend `MAX_RUPEES_PER_EXPENSE` / `parseAmountInputToPaise` rules for client-side gating. */
const MAX_RUPEES_PER_EXPENSE = 1e12;

function isValidCalendarDateIso(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Local calendar date +2 months (upper bound for accidental far-future entries). */
function getMaxExpenseDateIso() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setMonth(d.getMonth() + 2);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Field errors for submit + disabled button (kept in sync with API validation). */
function getSubmitErrors(fields) {
  const nextErrors = {};
  const amountStr = String(fields.amount ?? '').trim();

  if (!amountStr) {
    nextErrors.amount = 'Enter a positive amount';
  } else if (/[eE]/.test(amountStr)) {
    nextErrors.amount = 'Amount must not use scientific notation';
  } else if (!/^\d+(\.\d{1,2})?$/.test(amountStr)) {
    nextErrors.amount = 'At most 2 decimal places';
  } else {
    const rupees = Number(amountStr);
    if (!(rupees > 0)) {
      nextErrors.amount = 'Enter a positive amount';
    } else if (rupees > MAX_RUPEES_PER_EXPENSE) {
      nextErrors.amount = 'Amount exceeds maximum allowed value';
    } else {
      const paise = Math.round(rupees * 100);
      if (!Number.isSafeInteger(paise)) {
        nextErrors.amount = 'Amount is too large to represent safely';
      }
    }
  }

  const dateStr = fields.date?.trim() ?? '';
  const maxDate = getMaxExpenseDateIso();
  if (!dateStr) {
    nextErrors.date = 'Pick a date';
  } else if (!isValidCalendarDateIso(dateStr)) {
    nextErrors.date = 'Pick a real calendar date';
  } else if (dateStr > maxDate) {
    nextErrors.date = 'Date cannot be more than two months in the future';
  }

  if (!fields.description?.trim()) {
    nextErrors.description = 'Description is required';
  }

  return nextErrors;
}

const empty = () => ({
  amount: '',
  category: CATEGORIES[0],
  description: '',
  date: new Date().toISOString().split('T')[0], // today as YYYY-MM-DD
});

/**
 * ExpenseForm
 *
 * Controlled form. Local state only — no knowledge of the hook or API.
 * On submit, calls onSubmit(data) and awaits { ok, message }.
 *
 * Handles:
 * - Disabling submit while in-flight (prevents double-submit)
 * - Resetting form on success
 * - Inline validation per field after blur; button disabled until valid
 */
const initialTouched = () => ({ amount: false, date: false, description: false });

export function ExpenseForm({ onSubmit, submitting }) {
  const [fields, setFields] = useState(empty);
  const [touched, setTouched] = useState(initialTouched);

  const submitErrors = useMemo(() => getSubmitErrors(fields), [fields]);
  const submitBlocked = Object.keys(submitErrors).length > 0;

  const showErrors = useMemo(
    () => ({
      amount: touched.amount ? submitErrors.amount : undefined,
      date: touched.date ? submitErrors.date : undefined,
      description: touched.description ? submitErrors.description : undefined,
    }),
    [touched, submitErrors]
  );

  function set(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function markBlurred(field) {
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitBlocked) return;

    const result = await onSubmit(fields);
    if (result?.ok) {
      setFields(empty());
      setTouched(initialTouched());
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Add Expense</h2>

      <div className="grid grid-cols-2 gap-3">
        {/* Amount */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Amount (₹)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={fields.amount}
            onChange={(e) => set('amount', e.target.value)}
            onBlur={() => markBlurred('amount')}
            placeholder="0.00"
            required
            className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 ${
              showErrors.amount ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-gray-400'
            }`}
          />
          {showErrors.amount ? (
            <p className="text-xs text-red-600" role="alert">
              {showErrors.amount}
            </p>
          ) : null}
        </div>

        {/* Date */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Date</label>
          <input
            type="date"
            max={getMaxExpenseDateIso()}
            value={fields.date}
            onChange={(e) => set('date', e.target.value)}
            onBlur={() => markBlurred('date')}
            required
            className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 ${
              showErrors.date ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-gray-400'
            }`}
          />
          {showErrors.date ? (
            <p className="text-xs text-red-600" role="alert">
              {showErrors.date}
            </p>
          ) : null}
        </div>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Category</label>
        <select
          value={fields.category}
          onChange={(e) => set('category', e.target.value)}
          className={`${filterSelectClassName} w-full`}
          style={FILTER_SELECT_STYLE}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Description</label>
        <input
          type="text"
          value={fields.description}
          onChange={(e) => set('description', e.target.value)}
          onBlur={() => markBlurred('description')}
          placeholder="e.g. Lunch at Truffles"
          required
          maxLength={500}
          className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 ${
            showErrors.description ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-gray-400'
          }`}
        />
        {showErrors.description ? (
          <p className="text-xs text-red-600" role="alert">
            {showErrors.description}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={submitting || submitBlocked}
        className="w-full bg-gray-900 text-white text-sm font-medium rounded py-2.5 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Saving…' : 'Add Expense'}
      </button>
    </form>
  );
}
