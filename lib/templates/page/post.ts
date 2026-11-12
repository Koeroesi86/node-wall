import type { PageProps } from '../../types';
import wrapper from './wrapper';

interface PostPageProps extends PageProps {
  postId?: string;
}

export default (props: PostPageProps = {}) => wrapper({
  language: props.language,
  sessionId: props.sessionId,
  headers: `
    <script src="/static/components/tag-inline.js"></script>
    <script src="/static/components/link-preview.js"></script>
    <script src="/static/components/post-comments.js"></script>
    <script src="/static/components/post-comments-item.js"></script>
    <script src="/static/components/post-page.js"></script>
  `,
  content: `<post-page post-id="${props.postId}"></post-page>`,
});
