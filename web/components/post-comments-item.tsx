import { commentsActions } from '../store/comments.ts';
import { useEffect } from 'react';
import { formatDate } from '../format.ts';
import { CommentContent } from '../post-content.tsx';
import { useRedux } from '../use-redux.ts';
import './post-comments-item.css';

export const PostCommentsItem = ({ commentId }: { commentId: string }) => {
  const { state, dispatch } = useRedux();
  const comment = state?.comments[commentId];
  const anchor = `comment-${commentId}`;

  useEffect(() => {
    dispatch(commentsActions.request(commentId));
  }, [dispatch, commentId]);

  return (
    <div className="post-comments-item" id={anchor}>
      <div className="body">{comment && <CommentContent content={comment.body} />}</div>
      <a className="createdAt" href={`#${anchor}`}>{comment && formatDate(comment.created_at)}</a>
    </div>
  );
};
