import type { PageProps } from '../../types';
import escapeHtml from '../../utils/escapeHtml';
import wrapper from './wrapper';

export default (props: PageProps = {}) => wrapper({
  language: props.language,
  sessionId: props.sessionId,
  headers: `
    <script src="/static/components/privacy-page.js"></script>
  `,
  content: `<privacy-page controller="${escapeHtml(process.env.PRIVACY_CONTROLLER ?? '')}" contact="${escapeHtml(process.env.PRIVACY_CONTACT_EMAIL ?? '')}"></privacy-page>`,
});
