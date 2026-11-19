// What the classic scripts of the page provide. React components reach the store through them
// until the stores are migrated too.

interface ReduxAction {
  type: string;
  payload?: unknown;
}

type ReduxDispatch = (action: ReduxAction) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReduxState = any;

declare function connectRedux(mapState?: (state: ReduxState, previousState?: ReduxState) => void, connectDispatch?: (dispatch: ReduxDispatch) => void): void;
declare function disconnectRedux(mapState: (state: ReduxState, previousState?: ReduxState) => void): void;

declare const postsListActions: {
  createFilter: (instance: string, likedTags?: string[], dislikedTags?: string[]) => ReduxAction;
  setFilterTags: (instance: string, likedTags?: string[], dislikedTags?: string[]) => ReduxAction;
};
declare const userActions: {
  requestTags: () => ReduxAction;
};

declare module '*.css';
