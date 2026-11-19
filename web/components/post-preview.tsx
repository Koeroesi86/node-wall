import { useEffect, useRef, useState } from 'react';
import { useRedux } from '../use-redux.ts';
import { TranslateText } from '../translations.tsx';
import './post-preview.css';

interface PostPreviewProps {
  postId: string;
}

interface Tag {
  id: string;
}

interface Owner {
  name?: string;
}

const classes = (...names: (string | false)[]) => names.filter(Boolean).join(' ');

export const PostPreview = ({ postId }: PostPreviewProps) => {
  const { state, dispatch } = useRedux();
  const content = useRef<HTMLDivElement>(null);
  const [long, setLong] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [maxHeight, setMaxHeight] = useState<string>();
  const post = state?.posts[postId];
  const tags: Tag[] = post?.tags ?? [];
  const owner: Owner | undefined = post?.owner;

  useEffect(() => {
    dispatch(postsActions.request(postId));
  }, [dispatch, postId]);

  useEffect(() => {
    if (!post) return;
    // measured once the content is in the page
    const timer = setTimeout(() => setLong((content.current?.scrollHeight ?? 0) > (content.current?.clientHeight ?? 0)));

    return () => clearTimeout(timer);
  }, [post]);

  const expand = () => {
    setMaxHeight(`${content.current?.scrollHeight}px`);
    setTimeout(() => setShowAll(true), 300);
  };

  return (
    <div className={classes('post-preview', !!post && tags.length === 0 && 'noTags', long && 'long', showAll && 'showAll')}>
      <div className="loadingIndicator"><TranslateText alias="post-preview.loading" /></div>
      <div className="tags">
        {[...new Set(tags.map(tag => tag.id))].map(id => <tag-inline tag-id={id} key={id}></tag-inline>)}
      </div>
      <div
        className="content"
        ref={content}
        style={{ maxHeight }}
        dangerouslySetInnerHTML={{ __html: post ? parsePostContent(post.content, postId) : '' }}
      ></div>
      <div className="contentToggleWrapper">
        <div className="contentShadow"></div>
        <div className="contentToggle" onClick={expand}>
          <TranslateText alias="post-preview.show-more" />
        </div>
      </div>
      <div className="meta">
        <div className="sent">
          <TranslateText alias="post-preview.sent-at" />&nbsp;
          <a className="date" href={post ? `/post/${postId}` : undefined}>
            {post ? new Date(parseInt(post.created_at, 10)).toLocaleString() : undefined}
          </a>
        </div>
        <div className="owner">
          {owner && <>
            <TranslateText alias="post-preview.sent-by" />
            &nbsp;{owner.name && owner.name !== 'null' ? owner.name : <TranslateText alias="post-preview.unknown-user" />}
          </>}
        </div>
      </div>
    </div>
  );
};
