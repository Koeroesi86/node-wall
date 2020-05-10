const POSTS_LIST_ACTIONS = {
  REQUEST: 'POSTS_LIST_REQUEST',
  RECEIVE: 'POSTS_LIST_RECEIVE',
  LOAD_MORE: 'POSTS_LIST_LOAD_MORE',
  SET_NEXT_PAGE: 'POSTS_LIST_SET_NEXT_PAGE',
  CREATE_FILTER: 'POSTS_LIST_CREATE_FILTER',
};

const postsListActions = {
  /**
   * @returns {{payload: {}, type: string}}
   */
  loadMore: (instance) => ({ type: POSTS_LIST_ACTIONS.LOAD_MORE, payload: { instance } }),
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
        before: null,
        since: null,
        nextPageBefore: null,
        posts: [],
      },
    };
  }

  if (action.type === POSTS_LIST_ACTIONS.SET_NEXT_PAGE) {
    return {
      ...state,
      [action.payload.instance]: {
        ...state[action.payload.instance],
        nextPageBefore: action.payload.nextPageBefore,
      },
    };
  }

  if (action.type === POSTS_LIST_ACTIONS.RECEIVE) {
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
      const {
        likedTags,
        dislikedTags,
        nextPageBefore,
        since,
      } = store.getState()[action.payload.instance];

      store.dispatch({
        type: POSTS_LIST_ACTIONS.REQUEST,
        payload: { likedTags, dislikedTags, before: nextPageBefore, since, instance: action.payload.instance },
      });
    }

    if (action.type === POSTS_LIST_ACTIONS.REQUEST) {
      const {
        dislikedTags,
        likedTags,
        since,
        before,
        instance,
      } = action.payload;

      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const posts = JSON.parse(request.responseText);
            const nextPageBefore = request.getResponseHeader('x-next-page-before');
            if (nextPageBefore) {
              store.dispatch({ type: POSTS_LIST_ACTIONS.SET_NEXT_PAGE, payload: { nextPageBefore, instance } });
            }

            store.dispatch({ type: POSTS_LIST_ACTIONS.RECEIVE, payload: { posts, instance } });
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
