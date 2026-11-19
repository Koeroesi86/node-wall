import type { PageProps } from '../../types';
import reactTemplate from './reactTemplate';

interface TagPageProps extends PageProps {
  tag?: { id: string; name: string; type: string | null };
}

export default (props: TagPageProps = {}) => reactTemplate('tag', {
  tagId: props.tag?.id ?? '',
  tagName: props.tag?.name ?? '',
}, props, '<script src="/static/vendor/tribute.min.js"></script>');
