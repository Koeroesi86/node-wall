import escapeHtml from '../../utils/escapeHtml';
import { isSessionId } from '../../utils/sessionCookie';

interface WrapperProps {
  siteName?: string;
  title?: string;
  headers?: string;
  sessionId?: string;
  content?: string;
  language?: string;
  initialState?: Record<string, unknown>;
}

const getSiteName = (props: WrapperProps) => props.siteName || 'Üzenőfal';
const getTitle = (props: WrapperProps) => props.title ? `${getSiteName(props)} :: ${props.title}` : getSiteName(props);
const getHeaders = (props: WrapperProps) => props.headers || '';
const getSessionId = (props: WrapperProps) => isSessionId(props.sessionId) ? props.sessionId : '';
const getContent = (props: WrapperProps) => props.content || '';
const getLanguage = (props: WrapperProps) => escapeHtml(props.language || 'en-GB');
// Escaping `<` keeps the JSON from closing the script element.
const getInitialState = (props: WrapperProps) => JSON.stringify(props.initialState || {}).replace(/</g, '\\u003c');

export default (props: WrapperProps = {}) => (`
<!DOCTYPE html>
<html lang="${getLanguage(props).substr(0, 2)}">
  <head>
    <title>${getTitle(props)}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-session-id" content="${getSessionId(props)}" />
    <meta name="x-language" content="${getLanguage(props)}" />
    <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700&display=swap&subset=latin-ext" rel="stylesheet">
    <link href="/static/vendor/fontawesome/css/all.min.css" rel="stylesheet">
    <link href="/static/vendor/fontawesome/css/v4-shims.min.css" rel="stylesheet">
    <script src="/static/vendor/webcomponents-bundle.js"></script>
    <script src="/static/vendor/redux.min.js"></script>
    <script type="application/json" id="initial-state">${getInitialState(props)}</script>
    <script src="/static/utils/post.js"></script>
    <script src="/static/utils/comments.js"></script>
    <script src="/static/stores/serviceWorker.js"></script>
    <script src="/static/stores/translations.js"></script>
    <script src="/static/stores/tags.js"></script>
    <script src="/static/stores/posts.js"></script>
    <script src="/static/stores/bounds.js"></script>
    <script src="/static/stores/postsList.js"></script>
    <script src="/static/stores/user.js"></script>
    <script src="/static/stores/comments.js"></script>
    <script src="/static/stores/links.js"></script>
    <script src="/static/stores/redux.js"></script>
    <script src="/static/components/_component.js"></script>
    <script src="/static/components/translate-text.js"></script>
    <script src="/static/components/x-icon.js"></script>
    <script src="/static/components/navigation-wrapper.js"></script>
    <script src="/static/components/content-wrapper.js"></script>
    <script src="/static/components/main-wrapper.js"></script>
    ${getHeaders(props)}
  </head>
  <body>
    <main-wrapper>
      <navigation-wrapper session-id="${getSessionId(props)}"></navigation-wrapper>
      <content-wrapper>
        ${getContent(props)}
      </content-wrapper>
    </main-wrapper>
  </body>
</html>
`);
