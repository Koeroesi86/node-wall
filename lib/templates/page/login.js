const wrapper = require('./wrapper');

module.exports = (props = {}) => wrapper({
  headers: `
    <script src="/static/components/login-page.js"></script>
  `,
  content: `<login-page></login-page>`,
});
