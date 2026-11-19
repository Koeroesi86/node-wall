import { useEffect } from 'react';
import { useRedux } from '../use-redux.ts';
import { PostList } from './post-list.tsx';
import './tag-page.css';

interface TagPageProps {
  tagId?: string;
  /** The name the server knows, shown until the store has the tag. */
  tagName?: string;
}

export const TagPage = ({ tagId = '', tagName = '' }: TagPageProps) => {
  const { state, dispatch } = useRedux();
  const name: string = state?.tags[tagId]?.name ?? tagName;

  useEffect(() => {
    dispatch(postsListActions.createFilter(tagId, [tagId], []));
    dispatch(tagsActions.request(tagId));
    dispatch(postsListActions.loadMore(tagId));
  }, [dispatch, tagId]);

  // TODO: like/dislike tag
  return (
    <div className="tag-page">
      {name && <>
        <h2>{`#${name}`}</h2>
        <PostList instance={tagId} />
      </>}
    </div>
  );
};
