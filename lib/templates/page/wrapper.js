const getTitle = props => props.title ? `Üzenőfal :: ${props.title}` : 'Üzenőfal';
const getHeaders = props => props.headers || '';
const getContent = props => props.content || '';

module.exports = (props = {}) => (`
<html lang="hu">
  <head>
    <title>${getTitle(props)}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/static/style.css" />
    <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700&display=swap&subset=latin-ext" rel="stylesheet">
    <script src="https://kit.fontawesome.com/89bcd6101e.js" crossorigin="anonymous" async></script>
    <script src="/static/components/navigation-wrapper.js"></script>
    <script src="/static/components/content-wrapper.js"></script>
    <script src="/static/components/main-wrapper.js"></script>
    ${getHeaders(props)}
  </head>
  <body>
    <main-wrapper>
      <navigation-wrapper></navigation-wrapper>
      <content-wrapper>
        ${getContent(props)}
      </content-wrapper>
    </main-wrapper>
  </body>
</html>
`);
