import { describe, expect, test } from 'vitest';
import { renderPage } from './render-page.tsx';

const Hello = ({ name }: { name?: unknown }) => <p>Hello {String(name)}</p>;

describe('renderPage', () => {
  test('renders a registered page with its props', () => {
    expect(renderPage('hello', { name: 'wall' }, { hello: Hello })).toBe('<p>Hello <!-- -->wall</p>');
  });

  test('returns undefined for a page that is not registered', () => {
    expect(renderPage('missing', {}, { hello: Hello })).toBeUndefined();
  });

  test('renders the migrated pages from the default registry', () => {
    expect(renderPage('wall', { instance: 'i1' })).toBe('<div class="post-wall"><compose-post></compose-post></div>');
  });
});
