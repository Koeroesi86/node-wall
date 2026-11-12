import type { PageProps } from '../../types';
import wrapper from './wrapper';

export default (props: PageProps = {}) => wrapper({
  language: props.language,
  sessionId: props.sessionId,
  headers: `
    <script src="/static/components/tag-inline.js"></script>
    <script src="/static/components/profile-page.js"></script>
  `,
  content: `<profile-page session-id="${props.sessionId}"></profile-page>`,
});
