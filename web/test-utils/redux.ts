/** A stand-in for the page's redux store: the state under test control and the dispatched actions recorded. */
export const fakeRedux = () => {
  let state: ReduxState = {};
  const listeners: ((state: ReduxState, previous?: ReduxState) => void)[] = [];
  const dispatched: ReduxAction[] = [];

  Object.assign(window, {
    connectRedux: (mapState: (state: ReduxState, previous?: ReduxState) => void, connectDispatch: (dispatch: ReduxDispatch) => void) => {
      listeners.push(mapState);
      connectDispatch(action => dispatched.push(action));
      mapState(state);
    },
    disconnectRedux: (mapState: (state: ReduxState) => void) => {
      listeners.splice(listeners.indexOf(mapState), 1);
    },
    postsListActions: {
      createFilter: (instance: string, likedTags: string[], dislikedTags: string[]) => ({ type: 'POSTS_LIST_CREATE_FILTER', payload: { instance, likedTags, dislikedTags } }),
      setFilterTags: (instance: string, likedTags: string[], dislikedTags: string[]) => ({ type: 'POSTS_LIST_SET_FILTER_TAGS', payload: { instance, likedTags, dislikedTags } }),
    },
    userActions: { requestTags: () => ({ type: 'USER_REQUEST_TAGS', payload: {} }) },
  });

  return {
    dispatched,
    clearDispatched: () => dispatched.splice(0),
    /** Replaces the state and notifies the connected components, like a store update would. */
    setState: (next: ReduxState) => {
      const previous = state;
      state = next;
      listeners.slice().forEach(listener => listener(next, previous));
    },
  };
};
