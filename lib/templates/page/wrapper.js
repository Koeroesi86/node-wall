const getSiteName = props => props.siteName || 'Üzenőfal';
const getTitle = props => props.title ? `${getSiteName(props)} :: ${props.title}` : getSiteName(props);
const getHeaders = props => props.headers || '';
const getSessionId = props => props.sessionId || '';
const getContent = props => props.content || '';
const getLanguage = props => props.language || 'en-GB';

module.exports = (props = {}) => (`
<!DOCTYPE html>
<html lang="${getLanguage(props).substr(0, 2)}">
  <head>
    <title>${getTitle(props)}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-session-id" content="${getSessionId(props)}" />
    <meta name="x-language" content="${getLanguage(props)}" />
    <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700&display=swap&subset=latin-ext" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs@2.2.10/webcomponents-bundle.js"></script>
    <script src="https://kit.fontawesome.com/89bcd6101e.js" crossorigin="anonymous" async></script>
    <script src="https://unpkg.com/redux@4.0.5/dist/redux.min.js"></script>
    <script src="/static/stores/cache.js"></script>
    <script src="/static/stores/redux.js"></script>
    <script src="/static/components/_component.js"></script>
    <script src="/static/components/translate-text.js"></script>
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
