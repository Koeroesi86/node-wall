const wrapper = require('./wrapper');

module.exports = (props = {}) => wrapper({
  sessionId: props.sessionId,
  headers: `
    <script src="/static/components/profile-page.js"></script>
  `,
  content: `<profile-page session-id="${props.sessionId}"></profile-page>`,
});
