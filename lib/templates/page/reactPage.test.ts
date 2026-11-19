import { describe, expect, test } from 'vitest';
import { reactPage } from './reactPage';

describe('reactPage', () => {
  test('wraps the rendered markup and serialises the props for hydration', () => {
    const page = reactPage('wall', { note: '</script>' }, { language: 'hu-HU', render: (name, props) => `<p>${name}:${JSON.stringify(props?.note)}</p>` });

    expect(page?.content).toContain('<div id="root" data-page="wall"><p>wall:"</script>"</p></div>');
    expect(page?.content).toContain('"note":"\\u003c/script>"');
  });

  test('is undefined when the page is not rendered by React', () => {
    expect(reactPage('wall', {}, { render: () => undefined })).toBeUndefined();
  });

  test('provides the translations of the language to the page', () => {
    const page = reactPage('wall', {}, { language: 'hu-HU', render: () => '' });

    expect(page?.content).toContain('"post-list.loading":"Betöltés');
  });
});
