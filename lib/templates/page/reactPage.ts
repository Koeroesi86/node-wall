import escapeHtml from '../../utils/escapeHtml';
import { getEntryTags } from '../../utils/webAssets';
import { loadRenderer, type RenderPage } from '../../utils/loadRenderer';
import getTranslations from '../../translations/getTranslations';

const entry = 'web/entry-client.tsx';

// Escaping `<` keeps the JSON from closing the script element.
const serialise = (props: Record<string, unknown>) => JSON.stringify(props).replace(/</g, '\\u003c');

/**
 * The server rendered markup of a React page and the tags that hydrate it, ready for the wrapper's
 * `content` and `headers`, with the translations of the language. `undefined` when the page is not rendered by React (yet).
 */
export const reactPage = (
  name: string,
  pageProps: Record<string, unknown> = {},
  { language, render = loadRenderer() }: { language?: string; render?: RenderPage } = {},
) => {
  const props = { ...pageProps, translations: getTranslations(language) };
  const markup = render?.(name, props);

  return markup === undefined
    ? undefined
    : {
      headers: getEntryTags(entry),
      content: `<div id="root" data-page="${escapeHtml(name)}">${markup}</div>\n<script type="application/json" id="page-props">${serialise(props)}</script>`,
    };
};
