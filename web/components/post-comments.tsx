import { useRef } from 'react';
import { TranslateText } from '../translations.tsx';
import { useRedux } from '../use-redux.ts';
import { PostCommentsItem } from './post-comments-item.tsx';
import './post-comments.css';

export const PostComments = ({ postId }: { postId: string }) => {
  const { state, dispatch } = useRedux();
  const body = useRef<HTMLDivElement>(null);
  const comments: string[] | undefined = state?.posts[postId]?.comments;

  return (
    <div className="post-comments">
      <div className="commentsList">
        {comments?.map(id => <PostCommentsItem commentId={id} key={id} />)}
        {comments?.length === 0 && <TranslateText alias="post-comments.no-comments" />}
      </div>
      <div className="composer">
        <div className="body" contentEditable suppressContentEditableWarning ref={body}></div>
        <button
          className="send"
          onClick={(event) => {
            event.preventDefault();
            dispatch(commentsActions.create(postId, body.current?.innerHTML ?? '', null));
          }}
        >
          <TranslateText alias="post-comments.send-label" />
        </button>
      </div>
    </div>
  );
};
