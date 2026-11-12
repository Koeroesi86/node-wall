import { test, expect } from 'vitest';
import wrapper from './wrapper';

test('uses the default title without props', async () => {
  expect(await wrapper()).toMatch(/<title>Üzenőfal<\/title>/);
});

test('prefixes the title and renders content and headers', async () => {
  const html = await wrapper({ title: 'Hi', content: '<p>body</p>', headers: '<meta name="x" />' });
  expect(html).toMatch(/<title>\[Üzenőfal\] Hi<\/title>/);
  expect(html).toMatch(/<p>body<\/p>/);
  expect(html).toMatch(/<meta name="x" \/>/);
});
