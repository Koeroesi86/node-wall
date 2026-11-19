import { useEffect, useRef, useState } from 'react';
import { useRedux } from '../use-redux.ts';
import { ComposePost } from './compose-post.tsx';
import './post-wall.css';

interface PostWallProps {
  instance?: string;
}

interface UserTag {
  tag_id: string;
  type: string;
}

const tagIds = (tags: UserTag[], type: string) => tags.filter(tag => tag.type === type).map(tag => tag.tag_id);

export const PostWall = ({ instance = '' }: PostWallProps) => {
  const { state, dispatch } = useRedux();
  const [listShown, setListShown] = useState(false);
  // the tags the store had when it was last looked at; the first look only records them
  const seenTags = useRef<string | undefined>(undefined);
  const connected = useRef(false);

  useEffect(() => {
    dispatch(postsListActions.createFilter(instance, [], []));
    dispatch(userActions.requestTags());
  }, [dispatch, instance]);

  useEffect(() => {
    if (!state) return;
    const key = JSON.stringify(state.user.tags);
    const changed = connected.current && key !== seenTags.current;
    connected.current = true;
    seenTags.current = key;
    if (!changed || !instance) return;

    const tags: UserTag[] = state.user.tags;
    const likedTags = tagIds(tags, 'liked');
    const dislikedTags = tagIds(tags, 'disliked');

    dispatch(state.postsList[instance]
      ? postsListActions.setFilterTags(instance, likedTags, dislikedTags)
      : postsListActions.createFilter(instance, likedTags, dislikedTags));
    setListShown(true);
  }, [state, dispatch, instance]);

  return (
    <div className="post-wall">
      <ComposePost />
      {listShown && <post-list instance={instance}></post-list>}
    </div>
  );
};
