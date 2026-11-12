import wrapper from './wrapper';
import getTranslation from '../../translations/getTranslation';

interface ConfirmDeletionProps {
  title?: string;
  code?: string;
  language?: string;
}

export default async (props: ConfirmDeletionProps = {}) => await wrapper({
  title: props.title || '',
  headers: ``,
  content: `
    <div style="font-size: 14px; text-align: center;">
      ${(await getTranslation('email.delete.intro', props.language || 'en-GB')).value}
    </div>
    <div style="margin: 12px 0; clear: both; text-align: center;">
      <div style="display: inline-block; line-height: 35px; background: #333; color: #fff; padding: 0 12px; border-radius: 3px;">
        ${props.code || ''}
      </div>
    </div>
  `,
});
