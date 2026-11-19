import { useCallback, useEffect, useRef, useState } from 'react';

type StateListener = (state: ReduxState, previousState?: ReduxState) => void;

/**
 * The state of the page's redux store and its dispatch. The state is `undefined` until the store has
 * connected, which happens right after the first render in the browser (so never during SSR).
 * `onChange` is called for every store update, outside of rendering, with the previous state too.
 */
export const useRedux = (onChange?: StateListener) => {
  const [state, setState] = useState<ReduxState>();
  const dispatcher = useRef<ReduxDispatch>(() => {});
  const listener = useRef(onChange);
  listener.current = onChange;

  useEffect(() => {
    const mapState: StateListener = (next, previous) => {
      setState(next);
      listener.current?.(next, previous);
    };
    connectRedux(mapState, (dispatch) => {
      dispatcher.current = dispatch;
    });

    return () => disconnectRedux(mapState);
  }, []);

  return { state, dispatch: useCallback((action: ReduxAction) => dispatcher.current(action), []) };
};
