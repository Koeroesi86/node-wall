export interface Tag {
  id: string;
  name: string;
  type?: string;
}

/** A post as the store keeps it: a placeholder with only the content until the server answered. */
export interface StoredPost {
  id?: string;
  type?: string | null;
  content: string;
  created_at: string | number | null;
  tags: Tag[];
  comments?: string[];
  owner?: { id?: string; name?: string | null } | null;
}

export interface StoredComment {
  id: string;
  body: string;
  created_at: string | number | null;
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
  embedCode: string;
}

export interface UserTag {
  tag_id: string;
  type: string;
}

export interface UserSession {
  id: string;
  status: string | null;
}

export interface UserState {
  session: UserSession | null | false;
  received: boolean;
  tags: UserTag[] | null;
  name?: string | null;
  role?: string;
}

export interface PostsListState {
  likedTags: string[];
  dislikedTags: string[];
  before?: number | string | null;
  since?: number | string | null;
  /** Missing after the filter tags changed: paging starts over then. */
  nextPageBefore?: number;
  posts: string[];
  isLoading?: boolean;
  loadingStarted?: boolean;
}

export interface RootState {
  serviceWorker: Record<string, never>;
  tags: Record<string, Tag>;
  posts: Record<string, StoredPost>;
  postsList: Record<string, PostsListState>;
  user: UserState;
  links: Record<string, LinkPreview>;
  bounds: { newest: string | number | null; oldest: string | number | null };
  comments: Record<string, StoredComment>;
}

export interface AnyAction {
  type: string;
  payload?: unknown;
}

/** Narrows an action to the one with the given type. */
export const isAction = <A extends AnyAction>(action: AnyAction, type: A['type']): action is A => action.type === type;
