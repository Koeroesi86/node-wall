const wrapper = require('./wrapper');

module.exports = (props = {}) => wrapper({
  language: props.language,
  sessionId: props.sessionId,
  headers: `
    <script src="/static/components/tag-inline.js"></script>
    <script src="/static/components/link-preview.js"></script>
    <script src="/static/components/post-preview.js"></script>
    <script src="/static/components/post-page.js"></script>
  `,
  content: `<post-page post-id="${props.postId}"></post-page>`,
});
