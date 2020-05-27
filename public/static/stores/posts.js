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

const postsMiddleware = store => next => action => {
  if (action.type === POSTS_ACTIONS.REQUEST) {
    const { id } = action.payload;

    if (!store.getState().posts[id]) {
      store.dispatch({
        type: POSTS_ACTIONS.RECEIVE,
        payload: { id, post: { content: '', tags: [], created_at: Date.now() } },
      });

      Promise.resolve()
        .then(() => getPost(id))
        .then(post => {
          if (post) store.dispatch({
            type: POSTS_ACTIONS.RECEIVE,
            payload: { id, post },
          });
        })
        .catch(console.error);
    }
  }

  next(action);
};
