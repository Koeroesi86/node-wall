import type { PageProps } from '../../types';
import reactTemplate from './reactTemplate';

export default (props: PageProps = {}) => reactTemplate('privacy', {
  controller: process.env.PRIVACY_CONTROLLER ?? '',
  contact: process.env.PRIVACY_CONTACT_EMAIL ?? '',
}, props);
