import wrapper from './wrapper';
import getTranslation from '../../translations/getTranslation';

interface VerifyLoginProps {
  verifyUrl?: string;
  activateUrl?: string;
  title?: string;
  code?: string;
  language?: string;
}

const getVerifyUrl = (props: VerifyLoginProps) => props.verifyUrl || '';
const getActivateUrl = (props: VerifyLoginProps) => props.activateUrl || '';
const getTitle = (props: VerifyLoginProps) => props.title || '';
const getCode = (props: VerifyLoginProps) => props.code || '';
const getLanguage = (props: VerifyLoginProps) => props.language || 'en-GB';

export default async (props: VerifyLoginProps = {}) => await wrapper({
  title: getTitle(props),
  headers: ``,
  content: `
    <div style="font-size: 14px; text-align: center;">
      ${(await getTranslation('email.verify.intro', getLanguage(props))).value.replace('%ACTIVATION_URL%', getActivateUrl(props))}
    </div>
    <div style="margin: 12px 0; clear: both; text-align: center;">
      <div style="display: inline-block; line-height: 35px; background: #333; color: #fff; padding: 0 12px; border-radius: 3px;">
        ${getCode(props)}
      </div>
    </div>
    <div style="font-size: 14px; text-align: center;">
      ${(await getTranslation('email.verify.alternative', getLanguage(props))).value}
    </div>
    <div style="margin-top: 12px; font-size: 12px; text-align: center;">
      <a target="_blank" href="${getVerifyUrl(props)}">
        ${getVerifyUrl(props)}
      </a>
    </div>
  `,
});
