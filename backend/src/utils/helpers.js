/** Max rupees per expense (paise must stay a safe integer). */
const MAX_RUPEES_PER_EXPENSE = 1e12;

/**
 * Title-cases category words so "food" / "FOOD" / "Food" collapse to one stored value.
 */
function normalizeCategory(raw) {
  return String(raw)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Validates currency amount input: no scientific notation, at most two fraction digits,
 * positive, and within a sane upper bound. Returns integer paise.
 */
function parseAmountInputToPaise(amount) {
  if (typeof amount === 'number') {
    if (!Number.isFinite(amount) || !(amount > 0)) {
      throw new Error('Amount must be a positive number');
    }
    if (amount > MAX_RUPEES_PER_EXPENSE) {
      throw new Error('Amount exceeds maximum allowed value');
    }
    const paise = Math.round(amount * 100);
    if (!Number.isSafeInteger(paise)) {
      throw new Error('Amount is too large to represent safely');
    }
    const rupeesRounded = paise / 100;
    if (Math.abs(amount - rupeesRounded) > 0.0005 + Number.EPSILON * Math.abs(amount)) {
      throw new Error('Amount must have at most two decimal places');
    }
    return paise;
  }

  const s = String(amount).trim();
  if (/[eE]/.test(s)) {
    throw new Error('Amount must not use scientific notation');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    throw new Error('Amount must have at most two decimal places');
  }
  const rupees = Number(s);
  if (!(rupees > 0)) {
    throw new Error('Amount must be a positive number');
  }
  if (rupees > MAX_RUPEES_PER_EXPENSE) {
    throw new Error('Amount exceeds maximum allowed value');
  }
  const paise = Math.round(rupees * 100);
  if (!Number.isSafeInteger(paise)) {
    throw new Error('Amount is too large to represent safely');
  }
  return paise;
}

/**
 * True iff `value` is a YYYY-MM-DD string that exists on the calendar (UTC).
 */
function isValidCalendarDateIso(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Strips internal fields (contentHash) before sending to client.
 * Converts paise back to rupees as a string to preserve precision.
 */
const formatExpense=(expense)=> {
  return {
    id: expense.id,
    amount: (expense.amountPaise / 100).toFixed(2), // string, e.g. "10.50"
    category: expense.category,
    description: expense.description,
    date: expense.date,
    createdAt: expense.createdAt,
  };
}

module.exports={
  formatExpense,
  normalizeCategory,
  parseAmountInputToPaise,
  isValidCalendarDateIso,
  MAX_RUPEES_PER_EXPENSE,
}
