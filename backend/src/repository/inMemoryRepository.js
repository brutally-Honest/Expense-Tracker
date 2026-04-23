/**
 * In-Memory Expense Repository
 *
 * Implements the ExpenseRepository interface.
 * To swap to a real DB, create a new file (e.g. sqliteRepository.js)
 * that exports the same shape, and update app.js to import that instead.
 *
 * Interface contract:
 *   create(expense)          → expense
 *   findAll({ category, sort }) → expense[]
 *   findByHash(hash)         → expense | undefined
 *   findOrCreateByHash(hash, expense) → { expense, created }
 */

/** @type {Map<string, Object>} id → expense */
const store = new Map();

/** @type {Map<string, string>} contentHash → id (for idempotency) */
const hashIndex = new Map();

const inMemoryRepository = {
  /**
   * Persist a new expense.
   * Caller is responsible for dedup check via findByHash before calling this.
   */
  create(expense) {
    store.set(expense.id, expense);
    hashIndex.set(expense.contentHash, expense.id);
    return expense;
  },

  /**
   * Look up an expense by its content hash.
   * Returns undefined if not found (i.e. safe to insert).
   */
  findByHash(hash) {
    const id = hashIndex.get(hash);
    if (!id) return undefined;
    return store.get(id);
  },

  /**
   * Atomically insert by content hash or return the existing row (single-threaded check+set).
   * Use this instead of findByHash + create to avoid TOCTOU duplicates under concurrent POSTs.
   */
  findOrCreateByHash(hash, expense) {
    const existingId = hashIndex.get(hash);
    if (existingId) {
      return { expense: store.get(existingId), created: false };
    }
    store.set(expense.id, expense);
    hashIndex.set(hash, expense.id);
    return { expense, created: true };
  },

  /**
   * Return all expenses, optionally filtered and sorted.
   * @param {Object} opts
   * @param {string=} opts.category  - exact match filter
   * @param {string=} opts.sort      - 'date_desc' (default) | 'date_asc'
   */
  findAll({ category, sort } = {}) {
    let results = Array.from(store.values());

    if (category) {
      results = results.filter(
        (e) => e.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Default: newest first
    results.sort((a, b) => {
      const diff = new Date(b.date) - new Date(a.date);
      return sort === 'date_asc' ? -diff : diff;
    });

    return results;
  },
};

module.exports = inMemoryRepository;
