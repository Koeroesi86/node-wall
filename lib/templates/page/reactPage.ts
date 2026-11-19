import escapeHtml from '../../utils/escapeHtml';
import { getEntryTags } from '../../utils/webAssets';
import { loadRenderer, type RenderPage } from '../../utils/loadRenderer';

const entry = 'web/entry-client.tsx';

// Escaping `<` keeps the JSON from closing the script element.
const serialise = (props: Record<string, unknown>) => JSON.stringify(props).replace(/</g, '\\u003c');

/**
 * The server rendered markup of a React page and the tags that hydrate it, ready for the wrapper's
 * `content` and `headers`. `undefined` when the page is not rendered by React (yet).
 */
export const reactPage = (
  name: string,
  props: Record<string, unknown> = {},
  render: RenderPage | undefined = loadRenderer(),
) => {
  const markup = render?.(name, props);

  return markup === undefined
    ? undefined
    : {
      headers: getEntryTags(entry),
      content: `<div id="root" data-page="${escapeHtml(name)}">${markup}</div>\n<script type="application/json" id="page-props">${serialise(props)}</script>`,
    };
};
