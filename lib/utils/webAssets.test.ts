import { describe, expect, test } from 'vitest';
import { getEntryTags, type Manifest } from './webAssets';

const manifest: Manifest = {
  'web/entry-client.tsx': { file: 'assets/entry-client-abc123.js', css: ['assets/entry-client-def456.css'] },
  'web/plain.tsx': { file: 'assets/plain-111.js' },
};

describe('getEntryTags', () => {
  test('links the hashed stylesheet and script of an entry', () => {
    expect(getEntryTags('web/entry-client.tsx', manifest)).toBe([
      '<link rel="stylesheet" href="/static/app/assets/entry-client-def456.css">',
      '<script type="module" src="/static/app/assets/entry-client-abc123.js"></script>',
    ].join('\n'));
  });

  test('skips stylesheets when the entry has none', () => {
    expect(getEntryTags('web/plain.tsx', manifest)).toBe('<script type="module" src="/static/app/assets/plain-111.js"></script>');
  });

  test.each([
    ['an unknown entry', 'web/missing.tsx', manifest],
    ['no build', 'web/entry-client.tsx', undefined],
  ])('is empty for %s', (_name, entry, given) => {
    expect(getEntryTags(entry, given)).toBe('');
  });
});
