const request = require('supertest');
const app = require('../src/app');
const repo = require('../src/repository/inMemoryRepository');

const validExpense = {
  amount: '25.50',
  category: 'Food',
  description: 'Team lunch',
  date: '2024-06-15',
};

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/expenses', () => {
  beforeEach(() => {
    repo.resetForTests();
  });

  it('creates an expense (201) and returns formatted data', async () => {
    const res = await request(app).post('/api/expenses').send(validExpense);
    expect(res.status).toBe(201);
    expect(res.body.idempotent).toBe(false);
    expect(res.body.data).toMatchObject({
      amount: '25.50',
      category: 'Food',
      description: 'Team lunch',
      date: '2024-06-15',
    });
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.createdAt).toBeDefined();
  });

  it('returns same record on duplicate payload (200, idempotent)', async () => {
    const first = await request(app).post('/api/expenses').send(validExpense);
    expect(first.status).toBe(201);
    const id = first.body.data.id;

    const second = await request(app).post('/api/expenses').send(validExpense);
    expect(second.status).toBe(200);
    expect(second.body.idempotent).toBe(true);
    expect(second.body.data.id).toBe(id);
    expect(second.body.data.amount).toBe('25.50');
  });

  it('returns 422 for invalid amount', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .send({ ...validExpense, amount: '-5' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 422 for invalid calendar date', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .send({ ...validExpense, date: '2023-02-29' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for category not in GET /api/categories', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .send({ ...validExpense, category: 'BogusCategory' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('GET /api/expenses', () => {
  beforeEach(() => {
    repo.resetForTests();
  });

  async function seed() {
    await request(app).post('/api/expenses').send({
      amount: '10',
      category: 'Food',
      description: 'A',
      date: '2024-01-10',
    });
    await request(app).post('/api/expenses').send({
      amount: '20',
      category: 'Transport',
      description: 'B',
      date: '2024-02-01',
    });
    await request(app).post('/api/expenses').send({
      amount: '30',
      category: 'Food',
      description: 'C',
      date: '2024-01-05',
    });
  }

  it('lists all expenses sorted newest first by default', async () => {
    await seed();
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(200);
    expect(res.body.data.map((e) => e.date)).toEqual(['2024-02-01', '2024-01-10', '2024-01-05']);
  });

  it('filters by category (case-insensitive)', async () => {
    await seed();
    const res = await request(app).get('/api/expenses').query({ category: 'food' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((e) => e.category === 'Food')).toBe(true);
  });

  it('sorts date ascending when requested', async () => {
    await seed();
    const res = await request(app).get('/api/expenses').query({ sort: 'date_asc' });
    expect(res.body.data.map((e) => e.date)).toEqual(['2024-01-05', '2024-01-10', '2024-02-01']);
  });

  it('returns pagination meta and totalAmount for the full filtered set', async () => {
    await seed();
    const res = await request(app).get('/api/expenses').query({ limit: 2, page: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
      totalAmount: '60.00',
    });
  });

  it('clamps page when past the last page', async () => {
    await seed();
    const res = await request(app).get('/api/expenses').query({ page: 99, limit: 2 });
    expect(res.status).toBe(200);
    expect(res.body.meta.page).toBe(2);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 422 for invalid page', async () => {
    const res = await request(app).get('/api/expenses').query({ page: 0 });
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/expenses/:id', () => {
  beforeEach(() => {
    repo.resetForTests();
  });

  it('updates an expense (200)', async () => {
    const create = await request(app).post('/api/expenses').send(validExpense);
    const id = create.body.data.id;
    const res = await request(app)
      .patch(`/api/expenses/${id}`)
      .send({ ...validExpense, amount: '99.00', description: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id,
      amount: '99.00',
      description: 'Updated',
    });
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .patch('/api/expenses/00000000-0000-4000-8000-000000000000')
      .send(validExpense);
    expect(res.status).toBe(404);
  });

  it('returns 409 when another row already has the same content', async () => {
    const a = await request(app).post('/api/expenses').send({
      amount: '10',
      category: 'Food',
      description: 'Keep',
      date: '2024-01-10',
    });
    const b = await request(app).post('/api/expenses').send({
      amount: '20',
      category: 'Transport',
      description: 'Change me',
      date: '2024-02-01',
    });
    const res = await request(app)
      .patch(`/api/expenses/${b.body.data.id}`)
      .send({
        amount: '10',
        category: 'Food',
        description: 'Keep',
        date: '2024-01-10',
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_EXPENSE');
  });
});

describe('DELETE /api/expenses/:id', () => {
  beforeEach(() => {
    repo.resetForTests();
  });

  it('deletes an expense (204)', async () => {
    const create = await request(app).post('/api/expenses').send(validExpense);
    const id = create.body.data.id;
    const res = await request(app).delete(`/api/expenses/${id}`);
    expect(res.status).toBe(204);
    const list = await request(app).get('/api/expenses');
    expect(list.body.meta.total).toBe(0);
  });

  it('returns 404 when missing', async () => {
    const res = await request(app).delete('/api/expenses/00000000-0000-4000-8000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/categories', () => {
  it('returns the canonical category list', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toContain('Food');
    expect(res.body.data).toContain('Other');
  });
});

describe('GET /api/expenses/summary', () => {
  beforeEach(() => {
    repo.resetForTests();
  });

  it('returns an empty list when there are no expenses', async () => {
    const res = await request(app).get('/api/expenses/summary');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns totals and counts per category', async () => {
    await request(app).post('/api/expenses').send({
      amount: '10',
      category: 'Food',
      description: 'A',
      date: '2024-01-10',
    });
    await request(app).post('/api/expenses').send({
      amount: '20.50',
      category: 'Transport',
      description: 'B',
      date: '2024-02-01',
    });
    await request(app).post('/api/expenses').send({
      amount: '30',
      category: 'Food',
      description: 'C',
      date: '2024-01-05',
    });

    const res = await request(app).get('/api/expenses/summary');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    const food = res.body.data.find((r) => r.category === 'Food');
    const transport = res.body.data.find((r) => r.category === 'Transport');
    expect(food).toMatchObject({ count: 2, amount: '40.00' });
    expect(transport).toMatchObject({ count: 1, amount: '20.50' });
  });
});
