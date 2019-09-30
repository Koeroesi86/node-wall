const wrapper = require('./wrapper');

const getVerifyUrl = props => props.verifyUrl || '';
const getActivateUrl = props => props.activateUrl || '';
const getTitle = props => props.title || '';
const getCode = props => props.code || '';

module.exports = (props = {}) => wrapper({
  title: getTitle(props),
  headers: ``,
  content: `
    <div style="font-size: 14px; text-align: center;">
      Belépéshez írd be az alábbi kódot <a href="${getActivateUrl(props)}" target="_blank" style="font-weight: 600;">ezen a linken</a>:
    </div>
    <div style="margin: 12px 0; clear: both; text-align: center;">
      <div style="display: inline-block; line-height: 35px; background: #333; color: #fff; padding: 0 12px; border-radius: 3px;">
        ${getCode(props)}
      </div>
    </div>
    <div style="font-size: 14px; text-align: center;">Vagy kattints az alábbi linkre:</div>
    <div style="margin-top: 12px; font-size: 12px; text-align: center;">
      <a target="_blank" href="${getVerifyUrl(props)}">
        ${getVerifyUrl(props)}
      </a>
    </div>
  `,
});
