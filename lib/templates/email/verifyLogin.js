const wrapper = require('./wrapper');

const getVerifyUrl = props => props.verifyUrl || '';
const getTitle = props => props.title || '';
const getCode = props => props.code || '';

module.exports = (props = {}) => wrapper({
  title: getTitle(props),
  headers: ``,
  content: `
    <div>Belépéshez írd be az alábbi kódot:</div>
    <div style="margin: 12px 0; clear: both; text-align: center;">
      <div style="display: inline-block; line-height: 35px; background: #333; color: #fff; padding: 0 12px; border-radius: 3px;">
        ${getCode(props)}
      </div>
    </div>
    <div>Vagy kattints az alábbi linkre:</div>
    <div style="margin-top: 12px;font-size: 12px;">
      <a target="_blank" href="${getVerifyUrl(props)}">
        ${getVerifyUrl(props)}
      </a>
    </div>
  `,
});
