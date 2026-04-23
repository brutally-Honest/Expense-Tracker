const express = require('express');
const { body, query } = require('express-validator');
const { randomUUID } = require('crypto');

const { isAllowedCategoryNormalized } = require('../config/expenseCategories');
const repo = require('../repository/inMemoryRepository');
const { buildContentHash } = require('../utils/hash');
const { handleValidationErrors } = require('../middleware/errorHandler');
const {
  formatExpense,
  normalizeCategory,
  parseAmountInputToPaise,
  isValidCalendarDateIso,
} = require('../utils/helpers');

const router = express.Router();

// ─── Validation rules ────────────────────────────────────────────────────────

const createExpenseRules = [
  body('amount').custom((value) => {
    try {
      parseAmountInputToPaise(value);
      return true;
    } catch (err) {
      throw new Error(err.message);
    }
  }),
  // trim() runs first so whitespace-only category fails notEmpty (express-validator v7 order)
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: 100 })
    .custom((value) => {
      const normalized = normalizeCategory(value);
      if (!normalized) {
        throw new Error('Category is required');
      }
      if (!isAllowedCategoryNormalized(normalized)) {
        throw new Error('Category must be one of the values from GET /api/categories');
      }
      return true;
    }),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 }),
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO date (YYYY-MM-DD)')
    .custom((value) => {
      if (!isValidCalendarDateIso(value)) {
        throw new Error('Date must be a real calendar day (YYYY-MM-DD)');
      }
      return true;
    }),
];

const listExpenseRules = [
  query('category').optional().trim().isLength({ max: 100 }),
  query('sort').optional().isIn(['date_desc', 'date_asc']).withMessage("sort must be 'date_desc' or 'date_asc'"),
];

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/expenses
 *
 * Creates a new expense. Idempotent within a 30-second window:
 * sending the same payload twice returns the existing record (HTTP 200)
 * instead of creating a duplicate (HTTP 201).
 *
 * Money is stored as integer paise to avoid floating-point drift.
 * e.g. ₹10.50 → 1050 paise
 */
router.post('/', createExpenseRules, handleValidationErrors, (req, res) => {
  const { amount, category, description, date } = req.body;

  const amountPaise = parseAmountInputToPaise(amount);
  const categoryNorm = normalizeCategory(category);

  const contentHash = buildContentHash({
    amountPaise,
    category: categoryNorm,
    description,
    date,
  });

  const expense = {
    id: randomUUID(),
    amountPaise,
    category: categoryNorm,
    description: description.trim(),
    date,
    createdAt: new Date().toISOString(),
    contentHash,
  };

  const { expense: resolved, created } = repo.findOrCreateByHash(contentHash, expense);

  if (!created) {
    return res.status(200).json({ data: formatExpense(resolved), idempotent: true });
  }

  return res.status(201).json({ data: formatExpense(resolved), idempotent: false });
});

/**
 * GET /api/expenses/summary
 *
 * Returns totals per category (all expenses, not affected by list filters).
 */
router.get('/summary', (_req, res) => {
  const rows = repo.summaryByCategory();
  const data = rows.map((row) => ({
    category: row.category,
    count: row.count,
    amount: (row.amountPaise / 100).toFixed(2),
  }));
  return res.json({ data });
});

/**
 * GET /api/expenses
 *
 * Returns filtered + sorted list of expenses.
 * Query params:
 *   category  (string, optional) — exact category match (case-insensitive)
 *   sort      ('date_desc' | 'date_asc', default 'date_desc')
 */
router.get('/', listExpenseRules, handleValidationErrors, (req, res) => {
  const { category, sort = 'date_desc' } = req.query;
  const expenses = repo.findAll({ category, sort });
  return res.json({ data: expenses.map(formatExpense) });
});


module.exports = router;
