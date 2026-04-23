import { useState } from 'react';

const CATEGORIES = ['Food', 'Transport', 'Utilities', 'Shopping', 'Health', 'Entertainment', 'Other'];

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
 * - Inline validation for amount + date
 */
export function ExpenseForm({ onSubmit, submitting }) {
  const [fields, setFields] = useState(empty);
  const [errors, setErrors] = useState({});

  function set(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!(key in e)) return e;
      const { [key]: _, ...rest } = e;
      return rest;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const nextErrors = {};
    const amount = parseFloat(fields.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      nextErrors.amount = 'Enter a positive amount';
    }
    if (!fields.date?.trim()) {
      nextErrors.date = 'Pick a date';
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const result = await onSubmit(fields);
    if (result?.ok) {
      setFields(empty());
      setErrors({});
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
            placeholder="0.00"
            required
            className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 ${
              errors.amount ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-gray-400'
            }`}
          />
          {errors.amount ? (
            <p className="text-xs text-red-600" role="alert">
              {errors.amount}
            </p>
          ) : null}
        </div>

        {/* Date */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Date</label>
          <input
            type="date"
            value={fields.date}
            onChange={(e) => set('date', e.target.value)}
            required
            className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 ${
              errors.date ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-gray-400'
            }`}
          />
          {errors.date ? (
            <p className="text-xs text-red-600" role="alert">
              {errors.date}
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
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
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
          placeholder="e.g. Lunch at Truffles"
          required
          maxLength={500}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-gray-900 text-white text-sm font-medium rounded py-2.5 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Saving…' : 'Add Expense'}
      </button>
    </form>
  );
}
