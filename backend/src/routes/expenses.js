const express = require('express');
const { body, query } = require('express-validator');
const { randomUUID } = require('crypto');

const repo = require('../repository/inMemoryRepository');
const { buildContentHash } = require('../utils/hash');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { formatExpense } = require('../utils/helpers');

const router = express.Router();

// ─── Validation rules ────────────────────────────────────────────────────────

const createExpenseRules = [
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: 100 }),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 }),
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO date (YYYY-MM-DD)'),
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

  // Convert to paise
  const amountPaise = Math.round(parseFloat(amount) * 100);

  const contentHash = buildContentHash({ amountPaise, category, description, date });

  // Idempotency check
  const existing = repo.findByHash(contentHash);
  if (existing) {
    return res.status(200).json({ data: formatExpense(existing), idempotent: true });
  }

  const expense = {
    id: randomUUID(),
    amountPaise,
    category: category.trim(),
    description: description.trim(),
    date,                         // stored as YYYY-MM-DD string
    createdAt: new Date().toISOString(),
    contentHash,
  };

  repo.create(expense);

  return res.status(201).json({ data: formatExpense(expense), idempotent: false });
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
