import type { PageProps } from '../../types';
import reactTemplate from './reactTemplate';

interface PostPageProps extends PageProps {
  postId?: string;
}

export default (props: PostPageProps = {}) => reactTemplate('post', { postId: props.postId }, props);
