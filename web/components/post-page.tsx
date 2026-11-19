import { postsActions } from '../store/posts.ts';
import { useEffect } from 'react';
import { formatDate } from '../format.ts';
import { PostContent } from '../post-content.tsx';
import { TranslateText } from '../translations.tsx';
import { useRedux } from '../use-redux.ts';
import { PostComments } from './post-comments.tsx';
import { TagInline } from './tag-inline.tsx';
import { XIcon } from './x-icon.tsx';
import './post-page.css';

export const PostPage = ({ postId = '' }: { postId?: string }) => {
  const { state, dispatch } = useRedux();
  const post = state?.posts[postId];
  const tagIds: string[] = [...new Set<string>((post?.tags ?? []).map((tag: { id: string }) => tag.id))];

  useEffect(() => {
    dispatch(postsActions.request(postId));
  }, [dispatch, postId]);

  return (
    <div className="post-page">
      <div className="sentDate">
        {post && <>
          <XIcon type="sentDate" />
          <span>{formatDate(post.created_at)}</span>
        </>}
      </div>
      <h3 className="tags">{tagIds.map(id => <TagInline tagId={id} key={id} />)}</h3>
      <div className="postContent">{post && <PostContent content={post.content} postId={postId} />}</div>
      <h4 className="owner">
        {post?.owner && <>
          <TranslateText alias="post-preview.sent-by" />
          &nbsp;{post.owner.name && post.owner.name !== 'null' ? post.owner.name : <TranslateText alias="post-preview.unknown-user" />}
        </>}
      </h4>
      <div className="commentSection">
        <h4>
          <TranslateText alias="post-page.comments-header" />
        </h4>
        <PostComments postId={postId} />
      </div>
    </div>
  );
};
