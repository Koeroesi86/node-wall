import { describe, expect, test } from 'vitest';
import { reactPage } from './reactPage';

describe('reactPage', () => {
  test('wraps the rendered markup and serialises the props for hydration', () => {
    const page = reactPage('wall', { note: '</script>' }, (name, props) => `<p>${name}:${JSON.stringify(props)}</p>`);

    expect(page?.content).toContain('<div id="root" data-page="wall"><p>wall:{"note":"</script>"}</p></div>');
    expect(page?.content).toContain('id="page-props">{"note":"\\u003c/script>"}</script>');
  });

  test('is undefined when the page is not rendered by React', () => {
    expect(reactPage('wall', {}, () => undefined)).toBeUndefined();
  });
});
