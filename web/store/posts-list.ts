import type { Middleware } from 'redux';
import { PostListResponseSchema } from '../../lib/api-schemas';
import { getPost } from '../api/posts.ts';
import { POSTS_ACTIONS, postsActions } from './posts.ts';
import { isAction, type AnyAction, type PostsListState, type RootState } from './types.ts';

export const POSTS_LIST_ACTIONS = {
  APPEND: 'POSTS_LIST_APPEND',
  PREPEND: 'POSTS_LIST_PREPEND',
  LOAD_MORE: 'POSTS_LIST_LOAD_MORE',
  LOAD_NEW: 'POSTS_LIST_LOAD_NEW',
  SET_BEFORE: 'POSTS_LIST_SET_BEFORE',
  SET_SINCE: 'POSTS_LIST_SET_SINCE',
  SET_NEXT_PAGE: 'POSTS_LIST_SET_NEXT_PAGE',
  SET_LOADING_STARTED: 'POSTS_LIST_SET_LOADING_STARTED',
  SET_IS_LOADING: 'POSTS_LIST_SET_IS_LOADING',
  CREATE_FILTER: 'POSTS_LIST_CREATE_FILTER',
  SET_FILTER_TAGS: 'POSTS_LIST_SET_FILTER_TAGS',
} as const;

type Instance = { instance: string };
interface LoadMoreAction { type: typeof POSTS_LIST_ACTIONS.LOAD_MORE; payload: Instance }
interface LoadNewAction { type: typeof POSTS_LIST_ACTIONS.LOAD_NEW; payload: Instance }
interface FilterAction { type: typeof POSTS_LIST_ACTIONS.CREATE_FILTER | typeof POSTS_LIST_ACTIONS.SET_FILTER_TAGS; payload: Instance & { likedTags: string[]; dislikedTags: string[] } }
interface NextPageAction { type: typeof POSTS_LIST_ACTIONS.SET_NEXT_PAGE; payload: Instance & { nextPageBefore: number } }
interface SinceAction { type: typeof POSTS_LIST_ACTIONS.SET_SINCE; payload: Instance & { since: PostsListState['since'] } }
interface BeforeAction { type: typeof POSTS_LIST_ACTIONS.SET_BEFORE; payload: Instance & { before: PostsListState['before'] } }
interface AppendAction { type: typeof POSTS_LIST_ACTIONS.APPEND; payload: Instance & { posts: string[] } }
interface PrependAction { type: typeof POSTS_LIST_ACTIONS.PREPEND; payload: Instance & { posts: string[] } }
interface LoadingStartedAction { type: typeof POSTS_LIST_ACTIONS.SET_LOADING_STARTED; payload: Instance & { loadingStarted: boolean } }
interface IsLoadingAction { type: typeof POSTS_LIST_ACTIONS.SET_IS_LOADING; payload: Instance & { isLoading: boolean } }

export const postsListActions = {
  loadMore: (instance: string): LoadMoreAction => ({ type: POSTS_LIST_ACTIONS.LOAD_MORE, payload: { instance } }),
  loadNew: (instance: string): LoadNewAction => ({ type: POSTS_LIST_ACTIONS.LOAD_NEW, payload: { instance } }),
  createFilter: (instance: string, likedTags: string[] = [], dislikedTags: string[] = []): FilterAction => ({
    type: POSTS_LIST_ACTIONS.CREATE_FILTER,
    payload: { instance, likedTags, dislikedTags },
  }),
  setFilterTags: (instance: string, likedTags: string[] = [], dislikedTags: string[] = []): FilterAction => ({
    type: POSTS_LIST_ACTIONS.SET_FILTER_TAGS,
    payload: { instance, likedTags, dislikedTags },
  }),
};

type ListsState = RootState['postsList'];

const update = (state: ListsState, instance: string, change: Partial<PostsListState>): ListsState => ({
  ...state,
  [instance]: { ...state[instance], ...change },
});

/** A page can come back with posts the list has already; the list shows each post once. */
const withoutKnown = (known: string[], posts: string[]) => posts.filter((id, index) => !known.includes(id) && posts.indexOf(id) === index);

export function postsListReducer(state: ListsState = {}, action: AnyAction): ListsState {
  if (isAction<FilterAction>(action, POSTS_LIST_ACTIONS.CREATE_FILTER)) {
    const { instance, likedTags, dislikedTags } = action.payload;

    return {
      ...state,
      [instance]: {
        likedTags,
        dislikedTags,
        before: Date.now(),
        since: null,
        nextPageBefore: Date.now() + 1,
        posts: [],
        isLoading: false,
      },
    };
  }

  if (isAction<FilterAction>(action, POSTS_LIST_ACTIONS.SET_FILTER_TAGS)) {
    const { instance, likedTags, dislikedTags } = action.payload;

    // the whole entry is replaced, so the list starts again
    return { ...state, [instance]: { likedTags, dislikedTags, posts: [] } };
  }

  if (isAction<NextPageAction>(action, POSTS_LIST_ACTIONS.SET_NEXT_PAGE)) {
    return update(state, action.payload.instance, { nextPageBefore: action.payload.nextPageBefore });
  }

  if (isAction<SinceAction>(action, POSTS_LIST_ACTIONS.SET_SINCE)) {
    return update(state, action.payload.instance, { since: action.payload.since });
  }

  if (isAction<BeforeAction>(action, POSTS_LIST_ACTIONS.SET_BEFORE)) {
    return update(state, action.payload.instance, { before: action.payload.before });
  }

  if (isAction<AppendAction>(action, POSTS_LIST_ACTIONS.APPEND)) {
    const { instance, posts } = action.payload;

    return update(state, instance, { posts: [...state[instance].posts, ...withoutKnown(state[instance].posts, posts)] });
  }

  if (isAction<PrependAction>(action, POSTS_LIST_ACTIONS.PREPEND)) {
    const { instance, posts } = action.payload;

    return update(state, instance, { posts: [...withoutKnown(state[instance].posts, posts), ...state[instance].posts] });
  }

  if (isAction<LoadingStartedAction>(action, POSTS_LIST_ACTIONS.SET_LOADING_STARTED)) {
    return update(state, action.payload.instance, { loadingStarted: action.payload.loadingStarted });
  }

  if (isAction<IsLoadingAction>(action, POSTS_LIST_ACTIONS.SET_IS_LOADING)) {
    return update(state, action.payload.instance, { isLoading: action.payload.isLoading });
  }

  return state;
}

function getPosts(since: number | string | null, before: number | string | null, likedTags: string[] = [], dislikedTags: string[] = []) {
  return new Promise<{ posts: ReturnType<typeof PostListResponseSchema.parse>; nextPageBefore: string | null }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onreadystatechange = () => {
      if (request.readyState !== 4) return;
      if (request.status !== 200) return reject();

      resolve({
        posts: PostListResponseSchema.parse(JSON.parse(request.responseText)),
        nextPageBefore: request.getResponseHeader('x-next-page-before'),
      });
    };
    const url = new URL(location.origin);
    url.pathname = '/api/posts';
    if (since) url.searchParams.set('since', `${since}`);
    if (before) url.searchParams.set('before', `${before}`);
    if (likedTags.length > 0) url.searchParams.set('likedTags', likedTags.join(','));
    if (dislikedTags.length > 0) url.searchParams.set('dislikedTags', dislikedTags.join(','));
    request.open('GET', url.toString(), true);
    request.send();
  });
}

export const postsListMiddleware: Middleware<object, RootState> = store => next => (action) => {
  if (isAction<LoadMoreAction>(action, POSTS_LIST_ACTIONS.LOAD_MORE) && action.payload.instance) {
    const { instance } = action.payload;
    const { likedTags, dislikedTags, nextPageBefore: currentNextPageBefore, posts: currentPosts, isLoading } = store.getState().postsList[instance];
    const setLoading = (loading: boolean) => store.dispatch({ type: POSTS_LIST_ACTIONS.SET_IS_LOADING, payload: { instance, isLoading: loading } });

    if (!isLoading && currentNextPageBefore !== -1) {
      setLoading(true);
      Promise.resolve()
        .then(() => getPosts(currentNextPageBefore === undefined ? null : currentNextPageBefore - 100, currentNextPageBefore === undefined ? null : currentNextPageBefore + 1, likedTags, dislikedTags))
        .then(({ posts, nextPageBefore }) => {
          store.dispatch({
            type: POSTS_LIST_ACTIONS.SET_NEXT_PAGE,
            payload: { nextPageBefore: nextPageBefore ? parseInt(nextPageBefore, 10) : -1, instance },
          });

          if (posts && posts.length > 0) {
            store.dispatch({ type: POSTS_LIST_ACTIONS.SET_SINCE, payload: { since: posts[posts.length - 1].created_at, instance } });
            if (!currentPosts.length) {
              store.dispatch({ type: POSTS_LIST_ACTIONS.SET_BEFORE, payload: { before: posts[0].created_at, instance } });
            }
            Promise.resolve()
              .then(() => Promise.all(posts.map(post => getPost(post.id))))
              .then((postsDetails) => {
                setLoading(false);
                postsDetails.forEach(post => store.dispatch({ type: POSTS_ACTIONS.RECEIVE, payload: { id: post.id, post } }));
                store.dispatch({ type: POSTS_LIST_ACTIONS.APPEND, payload: { posts: posts.map(post => post.id), instance } });
              })
              .catch(console.error);
          } else if (nextPageBefore) {
            setLoading(false);
            store.dispatch(postsListActions.loadMore(instance));
          } else {
            setLoading(false);
          }
        })
        .catch((error) => {
          console.error(error);
          setLoading(false);
        });
    }
  }

  if (isAction<LoadNewAction>(action, POSTS_LIST_ACTIONS.LOAD_NEW)) {
    const { instance } = action.payload;
    const { likedTags, dislikedTags, before } = store.getState().postsList[instance];
    const { newest } = store.getState().bounds;

    Promise.resolve()
      .then(() => getPosts(before ?? null, newest, likedTags, dislikedTags))
      .then(({ posts }) => {
        if (posts.length > 0) {
          store.dispatch({ type: POSTS_LIST_ACTIONS.SET_BEFORE, payload: { before: posts[0].created_at, instance } });
          store.dispatch({ type: POSTS_LIST_ACTIONS.PREPEND, payload: { posts: posts.map(post => post.id), instance } });
          posts.forEach(post => store.dispatch(postsActions.request(post.id)));
        }
      })
      .catch(console.error);
  }

  return next(action);
};
