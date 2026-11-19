import { postsListActions } from '../store/posts-list.ts';
import { useEffect, useRef } from 'react';
import { PostPreview } from './post-preview.tsx';
import { useRedux } from '../use-redux.ts';
import { TranslateText } from '../translations.tsx';
import './post-list.css';

interface PostListProps {
  instance?: string;
}

export const PostList = ({ instance = '' }: PostListProps) => {
  const list = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const notification = useRef<HTMLAudioElement>(null);
  const oldest = useRef<unknown>(null);
  const { dispatch, state } = useRedux((next, previous) => {
    if (previous?.bounds.newest && Number(next.bounds.newest) > Number(previous.bounds.newest)) {
      setTimeout(() => {
        notification.current?.play();
        dispatch(postsListActions.loadNew(instance));
      }, 2000);
    }

    if (next.bounds.oldest !== oldest.current) {
      oldest.current = next.bounds.oldest;
      loadMore();
    }
  });
  const instanceState = instance ? state?.postsList?.[instance] : undefined;
  const posts: string[] = instanceState?.posts ?? [];
  const postsKey = JSON.stringify(instanceState?.posts);

  const loadMore = () => {
    const bottomEdge = (list.current?.scrollTop ?? 0) + (list.current?.clientHeight ?? 0);
    if ((end.current?.offsetTop ?? 0) > bottomEdge) return;

    dispatch(postsListActions.loadMore(instance));
  };

  useEffect(() => {
    const timer = setTimeout(loadMore, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (postsKey !== undefined) loadMore();
  }, [postsKey]);

  return (
    <div className="post-list" ref={list} onScroll={loadMore}>
      {posts.map(id => <PostPreview postId={id} key={id} />)}
      <audio src="/static/media/notification.mp3" className="notification" ref={notification}></audio>
      <div className={instanceState?.isLoading ? 'end loading' : 'end'} ref={end}>
        <div className="indicator"><TranslateText alias="post-list.loading" /></div>
      </div>
    </div>
  );
};
