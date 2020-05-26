const { v4: uuid } = require('uuid');
const wrapper = require('./wrapper');

const getInstance = (props = {}) => props.instance || uuid();

module.exports = (props = {}) => wrapper({
  language: props.language,
  sessionId: props.sessionId,
  headers: `
    <script src="https://cdn.jsdelivr.net/npm/tributejs@3.7.3/dist/tribute.min.js"></script>
    <script src="/static/utils/post.js"></script>
    <script src="/static/components/tag-inline.js"></script>
    <script src="/static/components/link-preview.js"></script>
    <script src="/static/components/post-preview.js"></script>
    <script src="/static/components/post-list.js"></script>
    <script src="/static/components/post-editor.js"></script>
    <script src="/static/components/compose-post.js"></script>
    <script src="/static/components/post-wall.js"></script>
  `,
  content: `<post-wall instance="${getInstance(props)}"></post-wall>`,
});
