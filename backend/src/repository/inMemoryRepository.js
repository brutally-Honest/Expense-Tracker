const { buildStableContentHash } = require('../utils/hash');

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
 *   findPage({ category, sort, page, limit }) → { items, total, totalAmountPaise, page, limit, totalPages }
 *   findById(id)             → expense | undefined
 *   updateById(id, fields)   → { ok, expense? , code? }
 *   deleteById(id)           → boolean
 *   findByHash(hash)         → expense | undefined
 *   findOrCreateByHash(hash, expense) → { expense, created }
 */

const DEFAULT_PAGE_LIMIT = 10;
const MAX_PAGE_LIMIT = 100;

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

  /**
   * Paginated slice of filtered/sorted expenses + aggregate counts for the full filtered set.
   * @param {number} [opts.page=1]  1-based page index
   * @param {number} [opts.limit=10] page size (clamped 1..100)
   */
  findPage({ category, sort, page = 1, limit = DEFAULT_PAGE_LIMIT } = {}) {
    const all = this.findAll({ category, sort });
    const total = all.length;
    const totalAmountPaise = all.reduce((sum, e) => sum + e.amountPaise, 0);

    let safeLimit = Number(limit);
    if (!Number.isFinite(safeLimit)) safeLimit = DEFAULT_PAGE_LIMIT;
    safeLimit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Math.floor(safeLimit)));

    let safePage = Number(page);
    if (!Number.isFinite(safePage)) safePage = 1;
    safePage = Math.max(1, Math.floor(safePage));

    const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
    if (totalPages > 0 && safePage > totalPages) {
      safePage = totalPages;
    }

    const offset = (safePage - 1) * safeLimit;
    const items = all.slice(offset, offset + safeLimit);

    return {
      items,
      total,
      totalAmountPaise,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  },

  findById(id) {
    return store.get(id);
  },

  /**
   * Replace expense fields; updates hash index. Fails if another row already has identical content.
   * @returns {{ ok: true, expense: object } | { ok: false, code: 'NOT_FOUND' | 'DUPLICATE' }}
   */
  updateById(id, { amountPaise, category, description, date }) {
    const existing = store.get(id);
    if (!existing) return { ok: false, code: 'NOT_FOUND' };

    const categoryNorm = category;
    const descTrim = description.trim();
    const newHash = buildStableContentHash({
      amountPaise,
      category: categoryNorm,
      description: descTrim,
      date,
    });

    const mappedId = hashIndex.get(newHash);
    if (mappedId && mappedId !== id) {
      return { ok: false, code: 'DUPLICATE' };
    }

    for (const other of store.values()) {
      if (other.id === id) continue;
      if (
        other.amountPaise === amountPaise &&
        other.category === categoryNorm &&
        other.description === descTrim &&
        other.date === date
      ) {
        return { ok: false, code: 'DUPLICATE' };
      }
    }

    hashIndex.delete(existing.contentHash);
    existing.amountPaise = amountPaise;
    existing.category = categoryNorm;
    existing.description = descTrim;
    existing.date = date;
    existing.contentHash = newHash;
    hashIndex.set(newHash, id);

    return { ok: true, expense: existing };
  },

  deleteById(id) {
    const e = store.get(id);
    if (!e) return false;
    hashIndex.delete(e.contentHash);
    store.delete(id);
    return true;
  },

  /**
   * Aggregate all expenses by category: total amount (paise) and count per category.
   * @returns {Array<{ category: string, amountPaise: number, count: number }>}
   */
  summaryByCategory() {
    const map = new Map();
    for (const e of store.values()) {
      const prev = map.get(e.category) || { amountPaise: 0, count: 0 };
      prev.amountPaise += e.amountPaise;
      prev.count += 1;
      map.set(e.category, prev);
    }
    return Array.from(map.entries())
      .map(([category, agg]) => ({
        category,
        amountPaise: agg.amountPaise,
        count: agg.count,
      }))
      .sort((a, b) => {
        if (b.amountPaise !== a.amountPaise) return b.amountPaise - a.amountPaise;
        return a.category.localeCompare(b.category);
      });
  },
};

/** Clears all data. Used by tests only (`jest` sets `NODE_ENV=test`). */
function resetForTests() {
  if (process.env.NODE_ENV !== 'test') return;
  store.clear();
  hashIndex.clear();
}

module.exports = { ...inMemoryRepository, resetForTests };
