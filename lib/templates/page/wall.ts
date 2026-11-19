import { randomUUID as uuid } from 'crypto';
import type { PageProps } from '../../types';
import wrapper from './wrapper';
import { reactPage } from './reactPage';

interface WallPageProps extends PageProps {
  instance?: string;
}

const getInstance = (props: WallPageProps = {}) => props.instance || uuid();

export default (props: WallPageProps = {}) => {
  const page = reactPage('wall', { instance: getInstance(props) });

  if (!page) throw new Error('The wall is rendered by React: run `npm run build` to create the server rendering bundle.');

  return wrapper({
    language: props.language,
    sessionId: props.sessionId,
    headers: `
    <script src="/static/vendor/tribute.min.js"></script>
    <script src="/static/utils/post.js"></script>
    <script src="/static/components/tag-inline.js"></script>
    <script src="/static/components/link-preview.js"></script>
    <script src="/static/components/post-editor.js"></script>
    ${page.headers}
  `,
    content: page.content,
  });
};
