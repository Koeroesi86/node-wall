import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The state of the page's redux store and its dispatch. The state is `undefined` until the store has
 * connected, which happens right after the first render in the browser (so never during SSR).
 */
export const useRedux = () => {
  const [state, setState] = useState<ReduxState>();
  const dispatcher = useRef<ReduxDispatch>(() => {});

  useEffect(() => {
    const mapState = (next: ReduxState) => setState(next);
    connectRedux(mapState, (dispatch) => {
      dispatcher.current = dispatch;
    });

    return () => disconnectRedux(mapState);
  }, []);

  return { state, dispatch: useCallback((action: ReduxAction) => dispatcher.current(action), []) };
};
