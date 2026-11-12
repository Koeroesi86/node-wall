import { describe, expect, it } from 'vitest';
import formatError from './formatError';

describe('formatError', () => {
  it('returns the stack of an Error', () => {
    const error = new Error('boom');
    expect(formatError(error)).toContain('boom');
  });

  it('does not dump properties of an Error', () => {
    const error = Object.assign(new Error('boom'), { recipient: 'a@b.c' });
    expect(formatError(error)).not.toContain('a@b.c');
  });

  it('stringifies non errors', () => {
    expect(formatError('nope')).toBe('nope');
  });
});
