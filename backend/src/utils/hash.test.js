const { buildContentHash, buildStableContentHash } = require('./hash');

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

describe('buildStableContentHash', () => {
  const payload = {
    amountPaise: 1050,
    category: 'Food',
    description: 'Lunch',
    date: '2024-06-01',
  };

  it('is deterministic and ignores wall clock (no time bucket)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-03-15T10:00:00.000Z'));
    const a = buildStableContentHash(payload);
    jest.setSystemTime(new Date('2025-03-15T11:59:59.000Z'));
    const b = buildStableContentHash(payload);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    jest.useRealTimers();
  });

  it('differs from buildContentHash for the same payload at the same instant', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));
    const stable = buildStableContentHash(payload);
    const windowed = buildContentHash(payload);
    expect(stable).not.toBe(windowed);
    jest.useRealTimers();
  });

  it('changes when any semantic field differs', () => {
    const base = buildStableContentHash(payload);
    expect(buildStableContentHash({ ...payload, amountPaise: 1051 })).not.toBe(base);
    expect(buildStableContentHash({ ...payload, category: 'Transport' })).not.toBe(base);
    expect(buildStableContentHash({ ...payload, description: 'Dinner' })).not.toBe(base);
    expect(buildStableContentHash({ ...payload, date: '2024-06-02' })).not.toBe(base);
  });

  it('treats description and category case-insensitively', () => {
    const h1 = buildStableContentHash({ ...payload, description: 'Lunch', category: 'Food' });
    const h2 = buildStableContentHash({ ...payload, description: 'lunch', category: 'food' });
    expect(h1).toBe(h2);
  });
});
