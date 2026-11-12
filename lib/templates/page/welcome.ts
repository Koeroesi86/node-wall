import type { PageProps } from '../../types';
import wrapper from './wrapper';

export default (props: PageProps = {}) => wrapper({
  language: props.language,
  sessionId: props.sessionId,
  headers: `
    <script src="/static/components/welcome-page.js"></script>
  `,
  content: `<welcome-page></welcome-page>`,
});
