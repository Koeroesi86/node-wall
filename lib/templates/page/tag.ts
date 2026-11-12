import type { PageProps } from '../../types';
import wrapper from './wrapper';
import escapeHtml from '../../utils/escapeHtml';

interface TagPageProps extends PageProps {
  tag?: { id: string; name: string; type: string };
}

const getTag = (props: TagPageProps) => props.tag;
const getTagId = (props: TagPageProps) => getTag(props)?.id ?? '';
const getTagName = (props: TagPageProps) => getTag(props)?.name ?? '';
const getTagType = (props: TagPageProps) => getTag(props)?.type ?? '';

export default (props: TagPageProps = {}) => wrapper({
  language: props.language,
  sessionId: props.sessionId,
  headers: `
    <script src="/static/vendor/tribute.min.js"></script>
    <script src="/static/components/tag-inline.js"></script>
    <script src="/static/components/link-preview.js"></script>
    <script src="/static/components/post-preview.js"></script>
    <script src="/static/components/post-list.js"></script>
    <script src="/static/components/tag-page.js"></script>
  `,
  content: `<tag-page tag-id="${escapeHtml(getTagId(props))}" tag-name="${escapeHtml(getTagName(props))}" tag-type="${escapeHtml(getTagType(props))}"></tag-page>`,
});
