const express = require('express');
const { ALLOWED_EXPENSE_CATEGORIES } = require('../config/expenseCategories');

const router = express.Router();

/**
 * GET /api/categories
 * Lists allowed expense category labels (for dropdowns / client validation).
 */
router.get('/', (_req, res) => {
  res.json({ data: [...ALLOWED_EXPENSE_CATEGORIES] });
});

module.exports = router;
