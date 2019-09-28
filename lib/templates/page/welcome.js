const wrapper = require('./wrapper');

module.exports = (props = {}) => wrapper({
  headers: `
    <script src="/static/components/welcome-page.js"></script>
  `,
  content: `<welcome-page></welcome-page>`,
});
