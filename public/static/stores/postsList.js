const POSTS_LIST_ACTIONS = {
  APPEND: 'POSTS_LIST_APPEND',
  PREPEND: 'POSTS_LIST_PREPEND',
  LOAD_MORE: 'POSTS_LIST_LOAD_MORE',
  LOAD_NEW: 'POSTS_LIST_LOAD_NEW',
  SET_BEFORE: 'POSTS_LIST_SET_BEFORE',
  SET_SINCE: 'POSTS_LIST_SET_SINCE',
  SET_NEXT_PAGE: 'POSTS_LIST_SET_NEXT_PAGE',
  SET_LOADING_STARTED: 'POSTS_LIST_SET_LOADING_STARTED',
  SET_IS_LOADING: 'POSTS_LIST_SET_IS_LOADING',
  CREATE_FILTER: 'POSTS_LIST_CREATE_FILTER',
};

const postsListActions = {
  /**
   * @param {String} instance
   * @returns {{payload: {}, type: string}}
   */
  loadMore: (instance) => ({ type: POSTS_LIST_ACTIONS.LOAD_MORE, payload: { instance } }),
  /**
   * @param {String} instance
   * @returns {{payload: {}, type: string}}
   */
  loadNew: (instance) => ({ type: POSTS_LIST_ACTIONS.LOAD_NEW, payload: { instance } }),
  /**
   * @param {String} instance
   * @param {String[]} [likedTags]
   * @param {String[]} [dislikedTags]
   * @returns {{payload: {likedTags: *[], instance: *, dislikedTags: *[]}, type: string}}
   */
  createFilter: (instance, likedTags = [], dislikedTags = []) => ({
    type: POSTS_LIST_ACTIONS.CREATE_FILTER,
    payload: { instance, likedTags, dislikedTags },
  }),
};

function postsListReducer(state = {}, action = {}) {
  if (action.type === POSTS_LIST_ACTIONS.CREATE_FILTER) {
    const {
      instance,
      likedTags,
      dislikedTags,
    } = action.payload;

    return {
      ...state,
      [instance]: {
        likedTags: likedTags,
        dislikedTags: dislikedTags,
        before: Date.now(),
        since: null,
        nextPageBefore: Date.now() + 1,
        posts: [],
        isLoading: false,
      },
    };
  }

  if (action.type === POSTS_LIST_ACTIONS.SET_NEXT_PAGE) {
    const { instance, nextPageBefore } = action.payload;
    return {
      ...state,
      [instance]: {
        ...state[instance],
        nextPageBefore,
      },
    };
  }

  if (action.type === POSTS_LIST_ACTIONS.SET_SINCE) {
    const { instance, since } = action.payload;
    return {
      ...state,
      [instance]: {
        ...state[instance],
        since,
      },
    };
  }

  if (action.type === POSTS_LIST_ACTIONS.SET_BEFORE) {
    const { instance, before } = action.payload;
    return {
      ...state,
      [instance]: {
        ...state[instance],
        before,
      },
    };
  }

  if (action.type === POSTS_LIST_ACTIONS.APPEND) {
    const { instance, posts } = action.payload;
    return {
      ...state,
      [instance]: {
        ...state[instance],
        posts: [
          ...state[instance].posts,
          ...posts
        ],
      }
    };
  }

  if (action.type === POSTS_LIST_ACTIONS.PREPEND) {
    const { instance, posts } = action.payload;
    return {
      ...state,
      [instance]: {
        ...state[instance],
        posts: [
          ...posts,
          ...state[instance].posts,
        ],
      }
    };
  }

  if (action.type === POSTS_LIST_ACTIONS.SET_LOADING_STARTED) {
    const { instance, loadingStarted } = action.payload;
    return {
      ...state,
      [instance]: {
        ...state[instance],
        loadingStarted,
      }
    };
  }

  if (action.type === POSTS_LIST_ACTIONS.SET_IS_LOADING) {
    const { instance, isLoading } = action.payload;
    return {
      ...state,
      [instance]: {
        ...state[instance],
        isLoading,
      }
    };
  }

  return state;
}

/**
 * @typedef PostsResponseItem
 * @property {String} id
 * @property {String} type
 * @property {Number} created_at
 */

/**
 * @typedef PostsListResult
 * @property {Number} [nextPageBefore]
 * @property {PostsResponseItem[]} posts
 */

/**
 * @param {Number} [since]
 * @param {Number} [before]
 * @param {String[]} likedTags
 * @param {String[]} dislikedTags
 * @returns {Promise<PostsListResult>}
 */
function getPosts(since, before, likedTags = [], dislikedTags = []) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4) {
        if (request.status === 200) {
          const posts = JSON.parse(request.responseText);
          const nextPageBefore = request.getResponseHeader('x-next-page-before');

          resolve({ posts, nextPageBefore });
        } else {
          reject();
        }
      }
    };
    const url = new URL(window.location.origin);
    url.pathname = '/api/posts';
    if (since) url.searchParams.set('since', since + '');
    if (before) url.searchParams.set('before', before + '');
    if (likedTags.length > 0) url.searchParams.set('likedTags', likedTags.join(','));
    if (dislikedTags.length > 0) url.searchParams.set('dislikedTags', dislikedTags.join(','));
    request.open("GET", url.toString(), true);
    request.send();
  });
}

const postsListMiddleware = store => next => action => {
  if (action.type === POSTS_LIST_ACTIONS.LOAD_MORE && action.payload.instance) {
    const { instance } = action.payload;
    const state = store.getState();
    const {
      likedTags,
      dislikedTags,
      nextPageBefore: currentNextPageBefore,
      posts: currentPosts,
      isLoading,
    } = state.postsList[instance];

    if (!isLoading && currentNextPageBefore !== -1) {
      store.dispatch({
        type: POSTS_LIST_ACTIONS.SET_IS_LOADING,
        payload: { instance, isLoading: true }
      });
      Promise.resolve()
        .then(() => getPosts(currentNextPageBefore - 100, currentNextPageBefore + 1, likedTags, dislikedTags))
        .then(({ posts, nextPageBefore }) => {
          store.dispatch({
            type: POSTS_LIST_ACTIONS.SET_IS_LOADING,
            payload: { instance, isLoading: false }
          });
          store.dispatch({
            type: POSTS_LIST_ACTIONS.SET_NEXT_PAGE,
            payload: { nextPageBefore, instance }
          });

          if (posts && posts.length > 0) {
            store.dispatch({
              type: POSTS_LIST_ACTIONS.SET_SINCE,
              payload: { since: posts[posts.length - 1].created_at, instance }
            });
            if (!currentPosts.length) {
              store.dispatch({
                type: POSTS_LIST_ACTIONS.SET_BEFORE,
                payload: { before: posts[0].created_at, instance }
              });
            }
            Promise.resolve()
              .then(() => Promise.all(posts.map(post => getPost(post.id))))
              .then(postsDetails => {
                postsDetails.forEach(post => {
                  store.dispatch({
                    type: POSTS_ACTIONS.RECEIVE,
                    payload: { id: post.id, post },
                  });
                })
                store.dispatch({
                  type: POSTS_LIST_ACTIONS.APPEND,
                  payload: {
                    posts: posts.map(post => post.id),
                    instance
                  }
                });
              })
              .catch(console.error);
          } else if (nextPageBefore) {
            store.dispatch(postsListActions.loadMore(instance));
          }
        })
        .catch(e => {
          console.error(e);
          store.dispatch({
            type: POSTS_LIST_ACTIONS.SET_IS_LOADING,
            payload: { instance, isLoading: false }
          });
        });
    }
  }

  if (action.type === POSTS_LIST_ACTIONS.LOAD_NEW) {
    const { instance } = action.payload;
    const state = store.getState();
    const {
      likedTags,
      dislikedTags,
      before,
    } = state.postsList[instance];
    const { newest } = state.bounds;

    Promise.resolve()
      .then(() => getPosts(before, newest, likedTags, dislikedTags))
      .then(({ posts }) => {
        if (posts.length > 0) {
          store.dispatch({
            type: POSTS_LIST_ACTIONS.SET_BEFORE,
            payload: { before: posts[0].created_at, instance }
          });
          store.dispatch({
            type: POSTS_LIST_ACTIONS.PREPEND,
            payload: { posts: posts.map(post => post.id) },
          });
          posts.forEach(post => {
            store.dispatch(postsActions.request(post.id));
          });
        }
      })
      .catch(console.error);
  }

  next(action);
};
