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
});
