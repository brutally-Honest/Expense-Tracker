/**
 * Canonical expense categories (single source of truth for API + validation).
 * GET /api/categories exposes this; POST /api/expenses only accepts these after normalization.
 */
const ALLOWED_EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Shopping',
  'Health',
  'Entertainment',
  'Other',
];

const ALLOWED_EXPENSE_CATEGORIES_SET = new Set(ALLOWED_EXPENSE_CATEGORIES);

function isAllowedCategoryNormalized(normalized) {
  return ALLOWED_EXPENSE_CATEGORIES_SET.has(normalized);
}

module.exports = {
  ALLOWED_EXPENSE_CATEGORIES,
  ALLOWED_EXPENSE_CATEGORIES_SET,
  isAllowedCategoryNormalized,
};
