// Globals provided by the CDN scripts and by the shared script files of the page.

interface ReduxAction {
  type: string;
  payload?: any;
}

type ReduxDispatch = (action: ReduxAction) => void;

interface ReduxStore {
  dispatch: ReduxDispatch;
  getState: () => any;
  subscribe: (listener: () => void) => () => void;
}

declare const Redux: {
  combineReducers: (reducers: Record<string, unknown>) => (state: unknown, action: ReduxAction) => unknown;
  compose: (...enhancers: unknown[]) => any;
  applyMiddleware: (...middlewares: unknown[]) => unknown;
  createStore: (reducer: unknown, state: unknown, enhancer: unknown) => ReduxStore;
};

declare class Tribute {
  constructor(options: Record<string, unknown>);
  attach(element: Element): void;
  detach(element: Element): void;
}

type ReduxMiddleware = (store: ReduxStore) => (next: ReduxDispatch) => (action: ReduxAction) => void;
type ReduxStateListener = (state: any, previousState?: any) => void;

declare function connectRedux(mapState?: ReduxStateListener, connectDispatch?: (dispatch: ReduxDispatch) => void): void;
declare function disconnectRedux(mapState: ReduxStateListener): void;
declare function shallowEqual(a: unknown, b: unknown): boolean;

declare const ReduxEventTypes: { dispatch: string; stateChange: string };
declare const ReduxEvents: { Dispatch: new (action: ReduxAction) => CustomEvent<{ action: ReduxAction }> };

interface TagData {
  id: string;
  name: string;
  type: string;
}

interface UserInfo {
  user: { id: string; name: string; role: string };
  session: unknown;
  login: unknown;
}

interface SessionData {
  sessionId: string;
  sessionStatus: string;
  sessionCreatedAt: number;
  lastActive?: number;
  loginType?: string;
  details?: { userAgent?: string; remoteAddress?: string } | null;
}

interface PostData {
  id: string;
  type: string;
  created_at: number | string;
  owner?: { id: string; name: string };
  status?: string;
  body?: string;
  content?: string;
  tags?: TagData[];
}

interface CommentData {
  id: string;
  post: string;
  parent?: string;
  owner?: string;
  body: string;
  created_at: number | string;
}

declare function escapeHtml(value?: unknown): string;
declare function parsePostContent(content: string, postId: string): string;
declare function parseCommentContent(content: string, postId?: string): string;
declare function getPost(id: string): Promise<PostData>;
declare function createPost(content?: string): Promise<XMLHttpRequest>;
declare function getComment(id: string): Promise<CommentData>;
declare function createComment(postId: string, body: string, parent?: string): Promise<void>;

/** The request and response schemas of `lib/api-schemas`, bundled into `/static/vendor/api-schemas.js`. */
interface ApiSchema<T> {
  parse(data: unknown): T;
}

declare const ApiSchemas: {
  AddPostTagRequestSchema: ApiSchema<{ id: string }>;
  BoundsResponseSchema: ApiSchema<{ oldest: number | string | null; newest: number | string | null }>;
  CommentResponseSchema: ApiSchema<CommentData>;
  CreateCommentRequestSchema: ApiSchema<{ postId: string; parent?: string; body: string }>;
  CreatePostRequestSchema: ApiSchema<{ content: string }>;
  CreateTagRequestSchema: ApiSchema<{ name: string; type: string }>;
  EmptyResponseSchema: ApiSchema<Record<string, never>>;
  LinkResponseSchema: ApiSchema<Record<string, string>>;
  LoginRequestSchema: ApiSchema<{ type: string; value: string; name?: string }>;
  LoginResponseSchema: ApiSchema<{ sessionId: string }>;
  PostListResponseSchema: ApiSchema<PostData[]>;
  PostResponseSchema: ApiSchema<PostData>;
  RemoveUserTagRequestSchema: ApiSchema<{ id: string }>;
  SessionListResponseSchema: ApiSchema<SessionData[]>;
  SetPostStatusRequestSchema: ApiSchema<{ status: string }>;
  SetUserNameRequestSchema: ApiSchema<{ name: string }>;
  SetUserRoleRequestSchema: ApiSchema<{ role: string }>;
  SetUserTagRequestSchema: ApiSchema<{ id: string; type: string }>;
  TagListResponseSchema: ApiSchema<TagData[]>;
  TagResponseSchema: ApiSchema<TagData>;
  UserInfoResponseSchema: ApiSchema<UserInfo>;
  UserListResponseSchema: ApiSchema<{ id: string; name?: string; role: string }[]>;
  UserTagListResponseSchema: ApiSchema<{ tag_id: string; type: string }[]>;
};

interface Window {
  connectRedux: typeof connectRedux;
  disconnectRedux: typeof disconnectRedux;
  shallowEqual: typeof shallowEqual;
  ReduxEventTypes: typeof ReduxEventTypes;
  ReduxEvents: typeof ReduxEvents;
  escapeHtml: typeof escapeHtml;
  parsePostContent: typeof parsePostContent;
  parseCommentContent: typeof parseCommentContent;
  getPost: typeof getPost;
  createPost: typeof createPost;
  getComment: typeof getComment;
  createComment: typeof createComment;
  __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: (...enhancers: unknown[]) => unknown;
}
