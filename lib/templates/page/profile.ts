import type { PageProps } from '../../types';
import reactTemplate from './reactTemplate';

export default (props: PageProps = {}) => reactTemplate('profile', { sessionId: props.sessionId }, props);
