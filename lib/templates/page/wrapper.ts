import escapeHtml from '../../utils/escapeHtml';
import { isSessionId } from '../../utils/sessionCookie';

interface WrapperProps {
  siteName?: string;
  title?: string;
  headers?: string;
  sessionId?: string;
  content?: string;
  language?: string;
}

const getSiteName = (props: WrapperProps) => props.siteName || 'Üzenőfal';
const getTitle = (props: WrapperProps) => props.title ? `${getSiteName(props)} :: ${props.title}` : getSiteName(props);
const getHeaders = (props: WrapperProps) => props.headers || '';
const getSessionId = (props: WrapperProps) => isSessionId(props.sessionId) ? props.sessionId : '';
const getContent = (props: WrapperProps) => props.content || '';
const getLanguage = (props: WrapperProps) => escapeHtml(props.language || 'en-GB');
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
    ${getHeaders(props)}
  </head>
  <body>
    ${getContent(props)}
  </body>
</html>
`);
