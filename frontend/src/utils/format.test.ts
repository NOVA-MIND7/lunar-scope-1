import { describe, expect, it } from 'vitest';
import { formatLatitude, formatLongitude, pluralDays } from './format';

describe('format', () => {
  it('formats hemispheres', () => {
    expect(formatLatitude(-89.9)).toBe('89.90° S');
    expect(formatLatitude(0.67)).toBe('0.67° N');
    expect(formatLongitude(-12.5)).toBe('12.50° W');
    expect(formatLongitude(177.6)).toBe('177.60° E');
  });
  it('pluralises days', () => {
    expect(pluralDays(1)).toBe('1 day');
    expect(pluralDays(14)).toBe('14 days');
  });
});
