import { v4 as uuid } from 'uuid';
import type { PageProps } from '../../types';
import wrapper from './wrapper';

interface WallPageProps extends PageProps {
  instance?: string;
}

const getInstance = (props: WallPageProps = {}) => props.instance || uuid();

export default (props: WallPageProps = {}) => wrapper({
  language: props.language,
  sessionId: props.sessionId,
  headers: `
    <script src="https://cdn.jsdelivr.net/npm/tributejs@3.7.3/dist/tribute.min.js"></script>
    <script src="/static/utils/post.js"></script>
    <script src="/static/components/tag-inline.js"></script>
    <script src="/static/components/link-preview.js"></script>
    <script src="/static/components/post-preview.js"></script>
    <script src="/static/components/post-list.js"></script>
    <script src="/static/components/post-editor.js"></script>
    <script src="/static/components/compose-post.js"></script>
    <script src="/static/components/post-wall.js"></script>
  `,
  content: `<post-wall instance="${getInstance(props)}"></post-wall>`,
});
