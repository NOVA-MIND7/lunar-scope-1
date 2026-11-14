import { describe, expect, it } from 'vitest';
import { addMilliseconds, formatUtc, toUtcIso } from './time';

describe('time utils', () => {
  it('builds ISO UTC strings', () => {
    expect(toUtcIso('2027-03-14', '06:30')).toBe('2027-03-14T06:30:00.000Z');
  });
  it('rejects invalid input', () => {
    expect(() => toUtcIso('not-a-date', '99:99')).toThrow(RangeError);
  });
  it('formats with an explicit UTC label', () => {
    expect(formatUtc('2027-03-14T06:30:00.000Z')).toBe('2027-03-14 06:30:00 UTC');
  });
  it('advances time', () => {
    expect(addMilliseconds('2027-01-01T00:00:00.000Z', 3_600_000)).toBe('2027-01-01T01:00:00.000Z');
  });
});
