import type { Middleware } from 'redux';
import { BoundsResponseSchema } from '../../lib/api-schemas';
import { isAction, type AnyAction, type RootState } from './types.ts';

export const BOUNDS_ACTIONS = {
  SET: 'BOUNDS_SET',
  GET: 'BOUNDS_GET',
} as const;

interface GetAction { type: typeof BOUNDS_ACTIONS.GET; payload: object }
interface SetAction { type: typeof BOUNDS_ACTIONS.SET; payload: RootState['bounds'] }

export const boundsActions = {
  get: (): GetAction => ({ type: BOUNDS_ACTIONS.GET, payload: {} }),
};

export function boundsReducer(state: RootState['bounds'] = { newest: null, oldest: null }, action: AnyAction) {
  return isAction<SetAction>(action, BOUNDS_ACTIONS.SET)
    ? { newest: action.payload.newest, oldest: action.payload.oldest }
    : state;
}

const refreshDelay = 2000;

export const boundsMiddleware: Middleware<object, RootState> = (store) => {
  let boundsTimer: ReturnType<typeof setTimeout> | undefined;
  setTimeout(() => store.dispatch(boundsActions.get()), 100);

  return next => (action) => {
    if (isAction<GetAction>(action, BOUNDS_ACTIONS.GET)) {
      clearTimeout(boundsTimer);

      const request = new XMLHttpRequest();
      request.onreadystatechange = () => {
        if (request.readyState !== 4) return;
        if (request.status === 200) {
          const { oldest, newest } = BoundsResponseSchema.parse(JSON.parse(request.responseText));
          store.dispatch({ type: BOUNDS_ACTIONS.SET, payload: { oldest, newest } });
        }
        boundsTimer = setTimeout(() => store.dispatch(boundsActions.get()), refreshDelay);
      };
      request.open('GET', '/api/posts/bounds', true);
      request.send();
    }

    return next(action);
  };
};
