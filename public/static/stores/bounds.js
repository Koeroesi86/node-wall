const BOUNDS_ACTIONS = {
  SET: 'BOUNDS_SET',
  GET: 'BOUNDS_GET',
};

const boundsActions = {
  get: () => ({ type: BOUNDS_ACTIONS.GET, payload: {} }),
};

function boundsReducer(state = { newest: null, oldest: null }, action = {}) {
  if (action.type === BOUNDS_ACTIONS.SET) {
    return {
      newest: action.payload.newest,
      oldest: action.payload.oldest,
    };
  }

  return state;
}

const boundsMiddleware = store => {
  let boundsTimer;
  setTimeout(() => {
    store.dispatch({ type: BOUNDS_ACTIONS.GET, payload: {} });
  }, 100);
  return next => action => {
    if (action.type === BOUNDS_ACTIONS.GET) {
      if (boundsTimer) clearTimeout(boundsTimer);

      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const bounds = JSON.parse(request.responseText);
            store.dispatch({
              type: BOUNDS_ACTIONS.SET,
              payload: { oldest: bounds.oldest, newest: bounds.newest }
            });
          }
          boundsTimer = setTimeout(() => {
            store.dispatch({ type: BOUNDS_ACTIONS.GET, payload: {} });
          }, 2000);
        }
      };
      request.open("GET", `/api/posts/bounds`, true);
      request.send();
    }

    next(action);
  };
}
