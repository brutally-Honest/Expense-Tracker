const crypto = require('crypto');

/**
 * Generates a deterministic hash for an expense payload.
 *
 * The 30-second window prevents duplicate submissions from fast retries
 * while allowing the same expense to be legitimately re-entered later.
 *
 * Analogy: Like a ticket stub — same show, same seat, same time window = same stub.
 *
 * @param {Object} payload
 * @param {number} payload.amountPaise - integer paise
 * @param {string} payload.category
 * @param {string} payload.description
 * @param {string} payload.date        - YYYY-MM-DD
 * @returns {string} hex hash
 */
function buildContentHash({ amountPaise, category, description, date }) {
  const windowSlot = Math.floor(Date.now() / 30_000); // 30-second bucket
  const raw = `${amountPaise}|${category.trim().toLowerCase()}|${description.trim().toLowerCase()}|${date}|${windowSlot}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = { buildContentHash };
