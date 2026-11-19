import { setStore } from '../store/index.ts';
import type { AnyAction, RootState } from '../store/types.ts';

/**
 * A stand-in for the page's redux store: the state is under test control and the dispatched actions
 * are recorded. The action creators are the real ones, so the actions are what the app would send.
 */
export const fakeRedux = () => {
  let state = {} as RootState;
  const listeners: (() => void)[] = [];
  const dispatched: AnyAction[] = [];

  setStore({
    getState: () => state,
    dispatch: <A extends AnyAction>(action: A) => {
      dispatched.push(action);

      return action;
    },
    subscribe: (listener) => {
      listeners.push(listener);

      return () => {
        listeners.splice(listeners.indexOf(listener), 1);
      };
    },
  });

  return {
    dispatched,
    clearDispatched: () => dispatched.splice(0),
    /** Replaces the state (only the slices a component reads need to be there) and notifies the subscribers. */
    setState: (next: Partial<Record<keyof RootState, unknown>>) => {
      state = next as RootState;
      listeners.slice().forEach(listener => listener());
    },
  };
};
