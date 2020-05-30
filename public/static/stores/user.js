const USER_ACTIONS = {
  REQUEST: 'USER_REQUEST',
  RECEIVE: 'USER_RECEIVE',
  REQUEST_TAGS: 'USER_REQUEST_TAGS',
  RECEIVE_TAGS: 'USER_RECEIVE_TAGS',
};

const userActions = {
  request: () => ({ type: USER_ACTIONS.REQUEST, payload: {} }),
  requestTags: () => ({ type: USER_ACTIONS.REQUEST_TAGS, payload: {} }),
};

function userReducer(state = {
  user: null,
  session: null,
  received: false,
  tags: [],
}, action = {}) {
  if (action.type === USER_ACTIONS.RECEIVE) {
    return {
      ...state,
      received: true,
      name: action.payload.user.name,
      role: action.payload.user.role,
      session: action.payload.session,
    }
  }

  if (action.type === USER_ACTIONS.RECEIVE_TAGS) {
    return {
      ...state,
      tags: action.payload.tags,
    }
  }

  return state;
}

const userMiddleware = store => next => action => {
  if (action.type === USER_ACTIONS.REQUEST) {
    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4) {
        if (request.status === 200) {
          store.dispatch({
            type: USER_ACTIONS.RECEIVE,
            payload: JSON.parse(request.responseText)
          });
        } else if (request.status === 401) {
          store.dispatch({
            type: USER_ACTIONS.RECEIVE,
            payload: {
              user: { role: 'guest', name: '' },
              session: false,
            }
          });
        }
      }
    };
    request.open("GET", "/api/user", true);
    request.send();
  }

  if (action.type === USER_ACTIONS.REQUEST_TAGS) {
    const request = new XMLHttpRequest();
    request.onreadystatechange = () => {
      if (request.readyState === 4) {
        if (request.status === 200) {
          const tags = JSON.parse(request.responseText);
          store.dispatch({ type: USER_ACTIONS.RECEIVE_TAGS, payload: { tags } });
        } else {
          store.dispatch({ type: USER_ACTIONS.RECEIVE_TAGS, payload: { tags: [] } });
        }
      }
    };
    request.open("GET", "/api/user/tags", true);
    request.send();
  }

  next(action);
}
