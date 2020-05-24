const POSTS_ACTIONS = {
  REQUEST: 'POSTS_REQUEST',
  RECEIVE: 'POSTS_RECEIVE',
};

const postsActions = {
  request: (id) => ({ type: POSTS_ACTIONS.REQUEST, payload: { id } }),
};

function postsReducer(state = {}, action = {}) {
  if (action.type === POSTS_ACTIONS.RECEIVE) {
    return {
      ...state,
      [action.payload.id]: action.payload.post,
    };
  }

  return state;
}

const getPost = (id) => new Promise((resolve, reject) => {
  const request = new XMLHttpRequest();
  request.onreadystatechange = e => {
    if (request.readyState === 4) {
      if (request.status === 200) {
        const post = JSON.parse(request.responseText);
        if (post) resolve(post);
      } else {
        reject(request);
      }
    }
  };
  request.open("GET", `/api/posts/${id}`, true);
  request.send();
})

const postsMiddleware = store => next => action => {
  if (action.type === POSTS_ACTIONS.REQUEST) {
    const { id } = action.payload;

    if (!store.getState().posts[id]) {
      store.dispatch({
        type: POSTS_ACTIONS.RECEIVE,
        payload: { id, post: { content: '', tags: [], created_at: Date.now() } },
      });
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const post = JSON.parse(request.responseText);
            if (post) store.dispatch({
              type: POSTS_ACTIONS.RECEIVE,
              payload: { id, post },
            });
          }
        }
      };
      request.open("GET", `/api/posts/${id}`, true);
      request.send();
    }
  }

  next(action);
};
