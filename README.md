# Expense Tracker

Minimal full-stack expense tracker for the assignment brief: **Express API** + **React (Vite) UI**, built for unreliable networks, duplicate submits, and refresh mid-request while keeping the feature set small and the code maintainable.

## Live demo & repository

- **Repository:** https://github.com/brutally-Honest/Expense-Tracker
- **Deployed app:** https://expense-tracker-one-zeta-94.vercel.app/

---

## Quick start

**Backend** (default `http://localhost:3000`):

```bash
cd backend && npm install && npm start
```

**Frontend** (default `http://localhost:5173`; dev server proxies `/api` → backend):

```bash
cd frontend && npm install && npm run dev
```

**Tests** (backend):

```bash
cd backend && npm test
```

**Health check:** `GET /health` → `{ "status": "ok" }`

---

## API routes

The assignment describes `POST /expenses` and `GET /expenses`. This project namespaces resources under **`/api`**:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/categories` | Allowed category labels |
| `POST` | `/api/expenses` | Create expense (idempotent under duplicate payload; see below) |
| `GET` | `/api/expenses` | List with optional `category`, `sort`, `page`, `limit` |
| `GET` | `/api/expenses/summary` | Totals per category (full dataset) |
| `PATCH` | `/api/expenses/:id` | Update expense |
| `DELETE` | `/api/expenses/:id` | Delete expense |

---

## Acceptance criteria (assignment)

| Criterion | Implementation |
|-----------|----------------|
| Create expense (amount, category, description, date) | Form + `POST /api/expenses`; server validates with **express-validator**. |
| View list | Table fed by `GET /api/expenses`. |
| Filter by category | Query `category`; case-insensitive match on normalized stored value. |
| Sort by date, newest first | Default `sort=date_desc`; `sort=date_asc` also supported. |
| Total for current list | Response `meta.totalAmount` is the sum for the **filtered** result set (correct when paginating). UI shows this total for the active filter/sort. |
| Behavior under retries, refresh, slow/failed API | **Server:** same normalized payload within a **30s window** maps to one row (`201` vs `200` + `idempotent: true`). **Client:** payload queued in **localStorage** before `fetch`; replay on load and on `online`; **fetch** uses a request timeout. |

**Nice-to-haves from the brief (included):** validation (amount, date, lengths), **summary by category**, **automated tests** (unit + HTTP integration), **loading and error feedback** (toasts, offline banner).

**Beyond the minimum spec:** pagination (`page`, `limit`), edit/delete (`PATCH` / `DELETE`), `GET /health`, Helmet + CORS configuration.

---

## Persistence choice

**In-memory `Map` (Node process)** with a small **repository module** (`backend/src/repository/inMemoryRepository.js`) as the only persistence seam.

**Rationale:** satisfies the assignment’s “any reasonable mechanism” with zero database setup, fast tests, and a clear boundary so the store can be swapped for SQLite/Postgres later without rewriting route handlers.

**Limitation:** data is lost on process restart; idempotency indexes are **not** shared across multiple server instances.

---

## Key design decisions

### Money

- Parsed and stored as **integer paise** on the server to avoid floating-point drift.
- API returns `amount` as a **two-decimal string** (e.g. `"10.50"`) so JSON does not introduce binary float issues on the wire.
- Input validation rejects invalid formats, scientific notation, non-positive amounts, and unsafe magnitudes.

### Idempotent `POST`

- **SHA-256** over normalized fields plus a **30-second time bucket** so accidental double-submit and quick network retries resolve to a single expense.
- **`findOrCreateByHash`** performs check-and-insert in one synchronous path for a single Node process (avoids duplicate rows from concurrent duplicate requests in one worker).

### Categories

- **Allowlist** from `GET /api/categories` (normalized title case). Keeps filters and storage consistent; category management is config-driven, not a separate CRUD API.

### Frontend structure

- **`api.js`:** all HTTP, shared timeout, one place for base URL (`VITE_API_URL` in prod vs Vite proxy in dev).
- **`useExpenses`:** fetches, filters, pagination, submit with draft persistence, refetch after mutations.
- **`reducer.js`:** list/filter/pagination UI state.

### Icons & dependencies

- Inline SVGs for actions (no icon package) to keep the bundle small for this scope.

---

## Trade-offs

| Choice | Benefit | Cost |
|--------|---------|------|
| In-memory store | Simple to run and test | No durability; not suitable for multi-instance without a shared DB |
| 30s hash bucket for idempotency | Works without client `Idempotency-Key` | Two **intentionally identical** rows within the same window would dedupe; production would often use a client key + DB unique constraint |
| String `amount` in JSON | Precise wire format | Client uses `parseFloat` for display totals—acceptable here; stricter UIs could keep integers client-side |
| Allowlist categories | Clean data | Adding categories requires code/config change |
| 60s default request timeout | Handles slow cold starts | User waits until timeout on a dead server unless tuned per call |

---

## Intentionally out of scope

- Durable database, migrations, backups
- Authentication, multi-tenant isolation, rate limiting
- Horizontal scaling and distributed idempotency (would need shared store + idempotency keys)
- Structured logging, metrics, distributed tracing
- End-to-end browser tests (Playwright/Cypress)
- Full offline-first sync (only **unsent create** is persisted and replayed; PATCH/DELETE are not queued offline)

---

## Environment variables

| Variable | Service | Purpose |
|----------|---------|---------|
| `PORT` | Backend | Listen port (default `3000`) |
| `NODE_ENV` | Backend | `test` allows test-only repository reset |
| `FRONTEND_URL` | Backend | Production CORS allowlist entry |
| `VITE_API_URL` | Frontend build | Absolute API origin when not using the Vite dev proxy |

---

## Testing

- **Unit:** `backend/src/utils/` — amount/date parsing, calendar validation, hash bucketing.
- **Integration:** `backend/tests/expenses.integration.test.js` — Supertest against the Express app: idempotent POST, list filter/sort/pagination, PATCH conflict (`409`), DELETE.

Frontend logic (draft replay, hooks) is covered manually; adding Vitest + React Testing Library would be the next step for automated UI coverage.

---

## Alignment with evaluation criteria (assignment)

The brief states evaluators care about **correctness under realistic conditions**, **money and edge cases**, **code clarity**, and **judgment on scope**.

This submission prioritizes: **integer money**, **calendar-safe dates**, **structured validation errors** (`422` with `details`), **POST idempotency** paired with a **client draft** for refresh/offline retry, a **clear repository boundary**, and **automated tests** on the API surface where behavior is easiest to lock down. Scope beyond the PDF (pagination, PATCH/DELETE) is implemented in a way that does not compromise the core create/list/filter/sort/total flow.

---

## License

Private / assignment submission unless otherwise noted.
