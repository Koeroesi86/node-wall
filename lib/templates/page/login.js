const wrapper = require('./wrapper');

module.exports = (props = {}) => wrapper({
  language: props.language,
  sessionId: props.sessionId,
  headers: `
    <script src="/static/components/login-page.js"></script>
  `,
  content: `<login-page></login-page>`,
});
