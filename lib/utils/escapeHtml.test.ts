import { test, expect } from 'vitest';
import escapeHtml from './escapeHtml';

test('escapes markup and quotes', () => {
  expect(escapeHtml(`<img src="x" onerror='a'>&`)).toBe('&lt;img src=&quot;x&quot; onerror=&#39;a&#39;&gt;&amp;');
});

test('handles undefined', () => {
  expect(escapeHtml(undefined)).toBe('');
});
