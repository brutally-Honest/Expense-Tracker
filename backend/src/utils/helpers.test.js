const {
  parseAmountInputToPaise,
  isValidCalendarDateIso,
  normalizeCategory,
  formatExpense,
} = require('./helpers');

describe('parseAmountInputToPaise', () => {
  it('parses string rupees with two decimals', () => {
    expect(parseAmountInputToPaise('10.50')).toBe(1050);
    expect(parseAmountInputToPaise('0.01')).toBe(1);
  });

  it('parses integer string and number', () => {
    expect(parseAmountInputToPaise('100')).toBe(10000);
    expect(parseAmountInputToPaise(100)).toBe(10000);
  });

  it('rejects zero, negative, and non-positive', () => {
    expect(() => parseAmountInputToPaise('0')).toThrow('positive');
    expect(() => parseAmountInputToPaise('-1')).toThrow();
    expect(() => parseAmountInputToPaise(0)).toThrow('positive');
  });

  it('rejects more than two fraction digits', () => {
    expect(() => parseAmountInputToPaise('10.001')).toThrow('two decimal');
    expect(() => parseAmountInputToPaise(10.001)).toThrow('two decimal');
  });

  it('rejects scientific notation', () => {
    expect(() => parseAmountInputToPaise('1e3')).toThrow('scientific');
  });

  it('trims whitespace on strings', () => {
    expect(parseAmountInputToPaise('  5.25  ')).toBe(525);
  });
});

describe('isValidCalendarDateIso', () => {
  it('accepts real calendar days (UTC)', () => {
    expect(isValidCalendarDateIso('2024-01-01')).toBe(true);
    expect(isValidCalendarDateIso('2024-02-29')).toBe(true);
  });

  it('rejects invalid calendar dates', () => {
    expect(isValidCalendarDateIso('2023-02-29')).toBe(false);
    expect(isValidCalendarDateIso('2024-13-01')).toBe(false);
    expect(isValidCalendarDateIso('not-a-date')).toBe(false);
  });
});

describe('normalizeCategory', () => {
  it('title-cases and collapses whitespace', () => {
    expect(normalizeCategory('  food  ')).toBe('Food');
    expect(normalizeCategory('TRANSPORT')).toBe('Transport');
  });
});

describe('formatExpense', () => {
  it('omits contentHash and formats amount as string', () => {
    const out = formatExpense({
      id: 'uuid-1',
      amountPaise: 1050,
      category: 'Food',
      description: 'Lunch',
      date: '2024-06-01',
      createdAt: '2024-06-01T12:00:00.000Z',
      contentHash: 'secret',
    });
    expect(out).toEqual({
      id: 'uuid-1',
      amount: '10.50',
      category: 'Food',
      description: 'Lunch',
      date: '2024-06-01',
      createdAt: '2024-06-01T12:00:00.000Z',
    });
  });
});
