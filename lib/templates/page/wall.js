const wrapper = require('./wrapper');

module.exports = (props = {}) => wrapper({
  headers: `
    <script src="https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs@2.2.10/webcomponents-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/tributejs@3.7.3/dist/tribute.min.js"></script>
    <script src="/static/components/link-preview.js"></script>
    <script src="/static/components/post-preview.js"></script>
    <script src="/static/components/post-list.js"></script>
    <script src="/static/components/post-editor.js"></script>
    <script src="/static/components/compose-post.js"></script>
    <script src="/static/components/post-wall.js"></script>
  `,
  content: `<post-wall></post-wall>`,
});
