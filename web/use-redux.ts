import { useCallback, useEffect, useRef, useState } from 'react';
import { getStore } from './store/index.ts';
import type { AnyAction, RootState } from './store/types.ts';

type StateListener = (state: RootState, previousState?: RootState) => void;

/**
 * The state of the page's redux store and its dispatch. The state is `undefined` until the store has
 * connected, which happens right after the first render in the browser (so never during SSR).
 * `onChange` is called for every store update, outside of rendering, with the previous state too.
 */
export const useRedux = (onChange?: StateListener) => {
  const [state, setState] = useState<RootState>();
  const listener = useRef(onChange);
  listener.current = onChange;

  useEffect(() => {
    const store = getStore();
    let previous: RootState | undefined;
    const update = () => {
      const next = store.getState();
      if (next === previous) return;

      const before = previous;
      previous = next;
      setState(next);
      listener.current?.(next, before);
    };

    update();

    return store.subscribe(update);
  }, []);

  return { state, dispatch: useCallback((action: AnyAction) => getStore().dispatch(action), []) };
};
