const POSTS_LIST_ACTIONS = {
  REQUEST: 'POSTS_LIST_REQUEST',
  RECEIVE: 'POSTS_LIST_RECEIVE',
  LOAD_MORE: 'POSTS_LIST_LOAD_MORE',
  SET_NEXT_PAGE: 'POSTS_LIST_SET_NEXT_PAGE',
};

const postsListActions = {
  /**
   * @returns {{payload: {}, type: string}}
   */
  loadMore: () => ({ type: POSTS_LIST_ACTIONS.LOAD_MORE, payload: {} }),
};

function postsListReducer(state = [], action = {}) {
  if (action.type === POSTS_LIST_ACTIONS.RECEIVE) {
    return [...state, ...action.payload.posts];
  }

  return state;
}

function postsFiltersReducer(state = {
  nextPageBefore: null,
  latest: null,
  since: null,
  dislikedTags: [],
  likedTags: [],
}, action = {}) {
  if (action.type === POSTS_LIST_ACTIONS.SET_NEXT_PAGE) {
    return {
      ...state,
      nextPageBefore: action.payload.nextPageBefore,
    };
  }

  return state;
}

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
    url.searchParams.set('since', since);
    if (before) url.searchParams.set('before', before);
    if (likedTags.length > 0) url.searchParams.set('likedTags', likedTags.join(','));
    if (dislikedTags.length > 0) url.searchParams.set('dislikedTags', dislikedTags.join(','));
    request.open("GET", url.toString(), true);
    request.send();
  });
}

const postsListMiddleware = store => next => action => {
    if (action.type === POSTS_LIST_ACTIONS.LOAD_MORE) {
      const likedTags = [];
      const dislikedTags = [];
      const before = Date.now();
      const since = Date.now();

      store.dispatch({
        type: POSTS_LIST_ACTIONS.REQUEST,
        payload: { likedTags, dislikedTags, before, since },
      });
    }

    if (action.type === POSTS_LIST_ACTIONS.REQUEST) {
      const {
        dislikedTags,
        likedTags,
        since,
        before,
      } = action.payload;

      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const posts = JSON.parse(request.responseText);
            const nextPageBefore = request.getResponseHeader('x-next-page-before');
            if (nextPageBefore) {
              store.dispatch({ type: POSTS_LIST_ACTIONS.SET_NEXT_PAGE, payload: { nextPageBefore } });
            }

            store.dispatch({ type: POSTS_LIST_ACTIONS.RECEIVE, payload: { posts } });
          }
        }
      };

      const url = new URL(window.location.origin);
      url.pathname = '/api/posts';

      if (since) url.searchParams.set('since', since);
      if (before) url.searchParams.set('before', before);
      if (likedTags.length > 0) url.searchParams.set('likedTags', likedTags.join(','));
      if (dislikedTags.length > 0) url.searchParams.set('dislikedTags', dislikedTags.join(','));

      request.open("GET", url.toString(), true);
      request.send();
    }

    next(action);
  };
