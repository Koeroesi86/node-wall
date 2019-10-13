const wrapper = require('./wrapper');

module.exports = (props = {}) => wrapper({
  headers: `
    <script src="/static/components/link-preview.js"></script>
    <script src="/static/components/post-preview.js"></script>
    <script src="/static/components/post-tags-input.js"></script>
    <script src="/static/components/moderation-page.js"></script>
  `,
  content: `<moderation-page></moderation-page>`,
});
