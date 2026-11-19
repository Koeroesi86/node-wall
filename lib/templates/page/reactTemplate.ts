import type { PageProps } from '../../types';
import { reactPage } from './reactPage';
import wrapper from './wrapper';

/**
 * A page rendered by React inside the wrapper. `scripts` are the classic scripts the page still needs
 * (loaded before the React bundle, which is a deferred module).
 */
export default (name: string, pageProps: Record<string, unknown>, props: PageProps, scripts = '') => {
  const page = reactPage(name, pageProps, { language: props.language });

  if (!page) throw new Error(`The ${name} page is rendered by React: run \`npm run build\` to create the server rendering bundle.`);

  return wrapper({
    language: props.language,
    sessionId: props.sessionId,
    headers: `${scripts}\n${page.headers}`,
    content: page.content,
  });
};
