const LINKS_ACTIONS = {
  REQUEST: 'LINKS_REQUEST',
  RECEIVE: 'LINKS_RECEIVE',
};

const linksActions = {
  request: (href, postId) => ({ type: LINKS_ACTIONS.REQUEST, payload: { href, postId } }),
};

function linksReducer(state = {}, action = {}) {
  if (action.type === LINKS_ACTIONS.RECEIVE) {
    return {
      ...state,
      [action.payload.url]: action.payload
    }
  }

  return state;
}

const linksMiddleware = store => next => action => {
  if (action.type === LINKS_ACTIONS.REQUEST) {
    const state = store.getState();
    const { href, postId } = action.payload;
    const post = state.posts[postId];
    if (post && post.content && post.content.includes(href) && !state.links[href]) {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4 && request.status === 200) {
          const linkPreview = JSON.parse(request.responseText);
          store.dispatch({ type: LINKS_ACTIONS.RECEIVE, payload: linkPreview });
        }
      };
      request.open('GET', `/api/link?post=${postId}&uri=${encodeURIComponent(href)}`, true);
      request.setRequestHeader('Content-Type', 'application/json');
      request.send();
    }
  }

  next(action);
}
