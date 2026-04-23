const { buildContentHash } = require('./hash');

describe('buildContentHash', () => {
  const payload = {
    amountPaise: 1050,
    category: 'Food',
    description: 'Lunch',
    date: '2024-06-01',
  };

  it('is deterministic within the same 30s bucket', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-03-15T10:00:00.000Z'));
    const a = buildContentHash(payload);
    const b = buildContentHash(payload);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    jest.useRealTimers();
  });

  it('changes when the 30s window advances', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-03-15T10:00:00.000Z'));
    const before = buildContentHash(payload);
    jest.setSystemTime(new Date('2025-03-15T10:00:31.000Z'));
    const after = buildContentHash(payload);
    expect(after).not.toBe(before);
    jest.useRealTimers();
  });

  it('changes when amount differs', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    const h1 = buildContentHash(payload);
    const h2 = buildContentHash({ ...payload, amountPaise: 1051 });
    expect(h1).not.toBe(h2);
    jest.useRealTimers();
  });

  it('treats description case-insensitively for hashing', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    const h1 = buildContentHash({ ...payload, description: 'Lunch' });
    const h2 = buildContentHash({ ...payload, description: 'lunch' });
    expect(h1).toBe(h2);
    jest.useRealTimers();
  });
});
