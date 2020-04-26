const wrapper = require('./wrapper');

module.exports = (props = {}) => wrapper({
  language: props.language,
  sessionId: props.sessionId,
  headers: `
    <script src="/static/components/welcome-page.js"></script>
  `,
  content: `<welcome-page></welcome-page>`,
});
