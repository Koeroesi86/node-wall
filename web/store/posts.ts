import type { Middleware } from 'redux';
import { getPost } from '../api/posts.ts';
import { isAction, type AnyAction, type RootState, type StoredPost } from './types.ts';

export const POSTS_ACTIONS = {
  REQUEST: 'POSTS_REQUEST',
  RECEIVE: 'POSTS_RECEIVE',
} as const;

interface RequestAction { type: typeof POSTS_ACTIONS.REQUEST; payload: { id: string } }
export interface ReceivePostAction { type: typeof POSTS_ACTIONS.RECEIVE; payload: { id: string; post: StoredPost } }

export const postsActions = {
  request: (id: string): RequestAction => ({ type: POSTS_ACTIONS.REQUEST, payload: { id } }),
};

export function postsReducer(state: RootState['posts'] = {}, action: AnyAction) {
  return isAction<ReceivePostAction>(action, POSTS_ACTIONS.RECEIVE)
    ? { ...state, [action.payload.id]: action.payload.post }
    : state;
}

export const postsMiddleware: Middleware<object, RootState> = store => next => (action) => {
  if (isAction<RequestAction>(action, POSTS_ACTIONS.REQUEST)) {
    const { id } = action.payload;

    if (!store.getState().posts[id]) {
      store.dispatch({
        type: POSTS_ACTIONS.RECEIVE,
        payload: { id, post: { content: '', tags: [], created_at: Date.now() } },
      });

      Promise.resolve()
        .then(() => getPost(id))
        .then((post) => {
          if (post) store.dispatch({ type: POSTS_ACTIONS.RECEIVE, payload: { id, post } });
        })
        .catch(console.error);
    }
  }

  return next(action);
};
