import type { Middleware } from 'redux';
import { TagResponseSchema } from '../../lib/api-schemas';
import { isAction, type AnyAction, type RootState, type Tag } from './types.ts';

export const TAGS_ACTIONS = {
  REQUEST: 'TAG_REQUEST',
  RECEIVE: 'TAG_RECEIVE',
} as const;

interface RequestAction { type: typeof TAGS_ACTIONS.REQUEST; payload: { id: string } }
interface ReceiveAction { type: typeof TAGS_ACTIONS.RECEIVE; payload: { id: string; tag: Tag } }

export const tagsActions = {
  request: (id: string): RequestAction => ({ type: TAGS_ACTIONS.REQUEST, payload: { id } }),
};

export function tagsReducer(state: RootState['tags'] = {}, action: AnyAction) {
  return isAction<ReceiveAction>(action, TAGS_ACTIONS.RECEIVE)
    ? { ...state, [action.payload.id]: action.payload.tag }
    : state;
}

export const tagsMiddleware: Middleware<object, RootState> = store => next => (action) => {
  if (isAction<RequestAction>(action, TAGS_ACTIONS.REQUEST)) {
    const { id } = action.payload;

    if (!store.getState().tags[id]) {
      const request = new XMLHttpRequest();
      request.onreadystatechange = () => {
        if (request.readyState === 4 && request.status === 200) {
          const tag = TagResponseSchema.parse(JSON.parse(request.responseText));
          store.dispatch({ type: TAGS_ACTIONS.RECEIVE, payload: { id, tag } });
        }
      };
      request.open('GET', `/api/tags/${id}`, true);
      request.send();
    }
  }

  return next(action);
};
