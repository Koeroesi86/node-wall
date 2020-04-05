const wrapper = require('./wrapper');

module.exports = (props = {}) => wrapper({
  sessionId: props.sessionId,
  headers: `
    <script src="https://cdn.jsdelivr.net/npm/tributejs@3.7.3/dist/tribute.min.js"></script>
    <script src="/static/components/tag-inline.js"></script>
    <script src="/static/components/link-preview.js"></script>
    <script src="/static/components/post-preview.js"></script>
    <script src="/static/components/post-list.js"></script>
    <script src="/static/components/post-editor.js"></script>
    <script src="/static/components/compose-post.js"></script>
    <script src="/static/components/post-wall.js"></script>
  `,
  content: `<post-wall></post-wall>`,
});
