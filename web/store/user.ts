import type { Middleware } from 'redux';
import { UserInfoResponseSchema, UserTagListResponseSchema } from '../../lib/api-schemas';
import { isAction, type AnyAction, type RootState, type UserState, type UserTag } from './types.ts';

export const USER_ACTIONS = {
  REQUEST: 'USER_REQUEST',
  RECEIVE: 'USER_RECEIVE',
  REQUEST_TAGS: 'USER_REQUEST_TAGS',
  RECEIVE_TAGS: 'USER_RECEIVE_TAGS',
} as const;

interface RequestAction { type: typeof USER_ACTIONS.REQUEST; payload: object }
interface RequestTagsAction { type: typeof USER_ACTIONS.REQUEST_TAGS; payload: object }
interface ReceiveAction {
  type: typeof USER_ACTIONS.RECEIVE;
  payload: { user: { name?: string | null; role: string }; session: UserState['session'] };
}
interface ReceiveTagsAction { type: typeof USER_ACTIONS.RECEIVE_TAGS; payload: { tags: UserTag[] } }

export const userActions = {
  request: (): RequestAction => ({ type: USER_ACTIONS.REQUEST, payload: {} }),
  requestTags: (): RequestTagsAction => ({ type: USER_ACTIONS.REQUEST_TAGS, payload: {} }),
};

const initialState: UserState = { session: null, received: false, tags: null };

export function userReducer(state: UserState = initialState, action: AnyAction): UserState {
  if (isAction<ReceiveAction>(action, USER_ACTIONS.RECEIVE)) {
    return {
      ...state,
      received: true,
      name: action.payload.user.name,
      role: action.payload.user.role,
      session: action.payload.session,
    };
  }

  return isAction<ReceiveTagsAction>(action, USER_ACTIONS.RECEIVE_TAGS) ? { ...state, tags: action.payload.tags } : state;
}

const hasSession = () => document.querySelector('meta[name="x-session-id"]')?.getAttribute('content') !== '';

export const userMiddleware: Middleware<object, RootState> = store => next => (action) => {
  if (isAction<RequestAction>(action, USER_ACTIONS.REQUEST)) {
    if (hasSession()) {
      const request = new XMLHttpRequest();
      request.onreadystatechange = () => {
        if (request.readyState !== 4) return;
        if (request.status === 200) {
          store.dispatch({ type: USER_ACTIONS.RECEIVE, payload: UserInfoResponseSchema.parse(JSON.parse(request.responseText)) });
        } else if (request.status === 401) {
          store.dispatch({ type: USER_ACTIONS.RECEIVE, payload: { user: { role: 'guest', name: '' }, session: false } });
        }
      };
      request.open('GET', '/api/user', true);
      request.send();
    } else {
      store.dispatch({ type: USER_ACTIONS.RECEIVE, payload: { user: { role: 'guest', name: '' }, session: false } });
    }
  }

  if (isAction<RequestTagsAction>(action, USER_ACTIONS.REQUEST_TAGS)) {
    if (hasSession()) {
      const request = new XMLHttpRequest();
      request.onreadystatechange = () => {
        if (request.readyState !== 4) return;
        const tags = request.status === 200 ? UserTagListResponseSchema.parse(JSON.parse(request.responseText)) : [];
        store.dispatch({ type: USER_ACTIONS.RECEIVE_TAGS, payload: { tags } });
      };
      request.open('GET', '/api/user/tags', true);
      request.send();
    } else {
      store.dispatch({ type: USER_ACTIONS.RECEIVE_TAGS, payload: { tags: [] } });
    }
  }

  return next(action);
};
