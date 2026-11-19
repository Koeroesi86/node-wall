import { applyMiddleware, combineReducers, compose, createStore, type Store } from 'redux';
import { boundsMiddleware, boundsReducer } from './bounds.ts';
import { commentsMiddleware, commentsReducer } from './comments.ts';
import { linksMiddleware, linksReducer } from './links.ts';
import { postsMiddleware, postsReducer } from './posts.ts';
import { postsListMiddleware, postsListReducer } from './posts-list.ts';
import { serviceWorkerMiddleware, serviceWorkerReducer } from './service-worker.ts';
import { tagsMiddleware, tagsReducer } from './tags.ts';
import type { RootState } from './types.ts';
import { userMiddleware, userReducer } from './user.ts';

const reducer = combineReducers<RootState>({
  serviceWorker: serviceWorkerReducer,
  tags: tagsReducer,
  posts: postsReducer,
  postsList: postsListReducer,
  user: userReducer,
  links: linksReducer,
  bounds: boundsReducer,
  comments: commentsReducer,
});

const middlewares = [
  serviceWorkerMiddleware,
  tagsMiddleware,
  postsMiddleware,
  userMiddleware,
  linksMiddleware,
  boundsMiddleware,
  postsListMiddleware,
  commentsMiddleware,
];

/** The store the page runs on. Creating it starts the background work (bounds polling, service worker clean-up). */
export const createAppStore = (): Store<RootState> => {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?? compose;

  return createStore(reducer, composeEnhancers(applyMiddleware(...middlewares)));
};

export type AppStore = Pick<Store<RootState>, 'getState' | 'dispatch' | 'subscribe'>;

let store: AppStore | undefined;

/** The store of the page, created on first use (in the browser only). */
export const getStore = (): AppStore => {
  store ??= createAppStore();

  return store;
};

/** Replaces the store, for tests. */
export const setStore = (replacement: AppStore | undefined) => {
  store = replacement;
};
