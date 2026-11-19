import type { Middleware } from 'redux';
import { LinkResponseSchema } from '../../lib/api-schemas';
import { isAction, type AnyAction, type LinkPreview, type RootState } from './types.ts';

export const LINKS_ACTIONS = {
  REQUEST: 'LINKS_REQUEST',
  RECEIVE: 'LINKS_RECEIVE',
} as const;

interface RequestAction { type: typeof LINKS_ACTIONS.REQUEST; payload: { href: string; postId: string } }
interface ReceiveAction { type: typeof LINKS_ACTIONS.RECEIVE; payload: LinkPreview }

export const linksActions = {
  request: (href: string, postId: string): RequestAction => ({ type: LINKS_ACTIONS.REQUEST, payload: { href, postId } }),
};

export function linksReducer(state: RootState['links'] = {}, action: AnyAction) {
  return isAction<ReceiveAction>(action, LINKS_ACTIONS.RECEIVE)
    ? { ...state, [action.payload.url]: action.payload }
    : state;
}

export const linksMiddleware: Middleware<object, RootState> = store => next => (action) => {
  if (isAction<RequestAction>(action, LINKS_ACTIONS.REQUEST)) {
    const state = store.getState();
    const { href, postId } = action.payload;
    const post = state.posts[postId];

    if (href && postId && post && post.content && post.content.includes(href.replace(/https?:\/\//, '')) && !state.links[href]) {
      const request = new XMLHttpRequest();
      request.onreadystatechange = () => {
        if (request.readyState === 4 && request.status === 200) {
          store.dispatch({ type: LINKS_ACTIONS.RECEIVE, payload: LinkResponseSchema.parse(JSON.parse(request.responseText)) });
        }
      };
      request.open('GET', `/api/link?post=${postId}&uri=${encodeURIComponent(href)}`, true);
      request.setRequestHeader('Content-Type', 'application/json');
      request.send();
    }
  }

  return next(action);
};
