const USER_ACTIONS = {
  REQUEST: 'USER_REQUEST',
  RECEIVE: 'USER_RECEIVE',
};

const userActions = {
  request: () => ({ type: USER_ACTIONS.REQUEST, payload: {} }),
};

function userReducer(state = {
  user: null,
  session: null,
  received: false,
}, action = {}) {
  if (action.type === USER_ACTIONS.RECEIVE) {
    return {
      ...state,
      received: true,
      user: action.payload.user,
      session: action.payload.session,
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

        }
      }
    };
    request.open("GET", "/api/user", true);
    request.send();
  }

  next(action);
}
