import type { PageProps } from '../../types';
import reactTemplate from './reactTemplate';

interface LoginPageProps extends PageProps {
  /** The pending session named in the url. */
  session?: string;
}

export default (props: LoginPageProps = {}) => reactTemplate('login', { session: props.session }, props);
