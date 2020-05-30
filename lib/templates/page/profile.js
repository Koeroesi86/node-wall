const wrapper = require('./wrapper');

module.exports = (props = {}) => wrapper({
  language: props.language,
  sessionId: props.sessionId,
  headers: `
    <script src="/static/components/tag-inline.js"></script>
    <script src="/static/components/profile-page.js"></script>
  `,
  content: `<profile-page session-id="${props.sessionId}"></profile-page>`,
});
