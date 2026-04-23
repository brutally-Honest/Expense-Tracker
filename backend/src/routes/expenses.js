const express = require('express');
const { body, query, param } = require('express-validator');
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
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

const idParamRules = [param('id').isUUID().withMessage('id must be a valid UUID')];

const patchExpenseRules = [
  ...idParamRules,
  body('amount').custom((value) => {
    try {
      parseAmountInputToPaise(value);
      return true;
    } catch (err) {
      throw new Error(err.message);
    }
  }),
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

const deleteExpenseRules = [...idParamRules];

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
  const { category, sort = 'date_desc', page, limit } = req.query;
  const pageNum = page !== undefined ? Number(page) : undefined;
  const limitNum = limit !== undefined ? Number(limit) : undefined;

  const {
    items,
    total,
    totalAmountPaise,
    page: resolvedPage,
    limit: resolvedLimit,
    totalPages,
  } = repo.findPage({
    category,
    sort,
    page: pageNum,
    limit: limitNum,
  });

  return res.json({
    data: items.map(formatExpense),
    meta: {
      page: resolvedPage,
      limit: resolvedLimit,
      total,
      totalPages,
      totalAmount: (totalAmountPaise / 100).toFixed(2),
    },
  });
});

/**
 * PATCH /api/expenses/:id
 *
 * Full replacement of expense fields (same validation as POST). Returns 409 if another
 * expense already matches the same amount, category, description, and date.
 */
router.patch('/:id', patchExpenseRules, handleValidationErrors, (req, res) => {
  const { id } = req.params;
  const { amount, category, description, date } = req.body;

  const amountPaise = parseAmountInputToPaise(amount);
  const categoryNorm = normalizeCategory(category);

  const result = repo.updateById(id, {
    amountPaise,
    category: categoryNorm,
    description,
    date,
  });

  if (!result.ok && result.code === 'NOT_FOUND') {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Expense not found' },
    });
  }
  if (!result.ok && result.code === 'DUPLICATE') {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_EXPENSE',
        message: 'Another expense already has this amount, category, description, and date.',
      },
    });
  }

  return res.json({ data: formatExpense(result.expense) });
});

/**
 * DELETE /api/expenses/:id
 */
router.delete('/:id', deleteExpenseRules, handleValidationErrors, (req, res) => {
  const { id } = req.params;
  const deleted = repo.deleteById(id);
  if (!deleted) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Expense not found' },
    });
  }
  return res.status(204).send();
});

module.exports = router;
