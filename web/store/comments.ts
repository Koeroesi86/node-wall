import type { Middleware } from 'redux';
import { createComment, getComment } from '../api/comments.ts';
import { isAction, type AnyAction, type RootState, type StoredComment } from './types.ts';

export const COMMENTS_ACTIONS = {
  REQUEST: 'COMMENTS_REQUEST',
  RECEIVE: 'COMMENTS_RECEIVE',
  CREATE: 'COMMENTS_CREATE',
} as const;

interface RequestAction { type: typeof COMMENTS_ACTIONS.REQUEST; payload: { id: string } }
interface ReceiveAction { type: typeof COMMENTS_ACTIONS.RECEIVE; payload: StoredComment }
interface CreateAction { type: typeof COMMENTS_ACTIONS.CREATE; payload: { id: string; parent: string | null | undefined; body: string } }

export const commentsActions = {
  request: (id: string): RequestAction => ({ type: COMMENTS_ACTIONS.REQUEST, payload: { id } }),
  create: (id: string, body: string, parent: string | null | undefined): CreateAction => ({ type: COMMENTS_ACTIONS.CREATE, payload: { id, parent, body } }),
};

export function commentsReducer(state: RootState['comments'] = {}, action: AnyAction) {
  return isAction<ReceiveAction>(action, COMMENTS_ACTIONS.RECEIVE)
    ? { ...state, [action.payload.id]: action.payload }
    : state;
}

/** The editor's HTML as text: every block starts a line. */
const toText = (html: string) => {
  const node = document.createElement('div');
  node.innerHTML = html;
  [...node.querySelectorAll('div')].forEach(block => block.replaceWith(block.innerHTML === '<br>' ? '\n\n' : `\n${block.innerHTML}`));
  node.innerHTML = node.innerHTML.replace(/\r/gi, '\n');

  return node.innerHTML;
};

export const commentsMiddleware: Middleware<object, RootState> = store => next => (action) => {
  if (isAction<RequestAction>(action, COMMENTS_ACTIONS.REQUEST)) {
    getComment(action.payload.id).then(comment => store.dispatch({ type: COMMENTS_ACTIONS.RECEIVE, payload: comment }));
  }

  if (isAction<CreateAction>(action, COMMENTS_ACTIONS.CREATE)) {
    const { id, parent, body } = action.payload;

    createComment(id, toText(body), parent ?? undefined).then(() => {
      location.reload(); // TODO: dynamic comment loading
    });
  }

  return next(action);
};
