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
  loadMore: (instance: string) => ReduxAction;
  loadNew: (instance: string) => ReduxAction;
  createFilter: (instance: string, likedTags?: string[], dislikedTags?: string[]) => ReduxAction;
  setFilterTags: (instance: string, likedTags?: string[], dislikedTags?: string[]) => ReduxAction;
};
declare const userActions: {
  requestTags: () => ReduxAction;
};

declare const postsActions: {
  request: (id: string) => ReduxAction;
};
declare const tagsActions: {
  request: (id: string) => ReduxAction;
};
declare const linksActions: {
  request: (href: string, postId: string) => ReduxAction;
};
declare function escapeHtml(value?: unknown): string;
declare const ApiSchemas: {
  TagListResponseSchema: { parse(data: unknown): unknown };
  ActivateSessionRequestSchema: { parse(data: unknown): unknown };
  LoginRequestSchema: { parse(data: unknown): unknown };
  LoginResponseSchema: { parse(data: unknown): { sessionId: string } };
  SetUserTagRequestSchema: { parse(data: unknown): unknown };
  RemoveUserTagRequestSchema: { parse(data: unknown): unknown };
};
declare class Tribute {
  constructor(options: Record<string, unknown>);
  attach(element: Element): void;
  detach(element: Element): void;
}
declare function createPost(content?: string): Promise<unknown>;

declare module '*.css';
