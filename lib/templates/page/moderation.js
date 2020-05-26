const wrapper = require('./wrapper');

module.exports = (props = {}) => wrapper({
  language: props.language,
  sessionId: props.sessionId,
  headers: `
    <script src="/static/utils/post.js"></script>
    <script src="/static/components/tag-inline.js"></script>
    <script src="/static/components/link-preview.js"></script>
    <script src="/static/components/post-preview.js"></script>
    <script src="/static/components/post-tags-input.js"></script>
    <script src="/static/components/moderation-page.js"></script>
  `,
  content: `<moderation-page></moderation-page>`,
});
