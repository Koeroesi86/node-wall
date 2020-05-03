const TAGS_ACTIONS = {
  REQUEST: 'TAG_REQUEST',
  RECEIVE: 'TAG_RECEIVE',
};

function tagsReducer(state = {}, action = {}) {
  if (action.type === TAGS_ACTIONS.RECEIVE) {
    return {
      ...state,
      [action.payload.id]: action.payload.tag,
    };
  }

  return state;
}

const tagsMiddleware = store => next => action => {
  if (action.type === TAGS_ACTIONS.REQUEST) {
    const { id } = action.payload;

    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4) {
        if (request.status === 200) {
          const tag = JSON.parse(request.responseText);
          if (tag) store.dispatch({
            type: TAGS_ACTIONS.RECEIVE,
            payload: { id, tag },
          });
        }
      }
    };
    request.open("GET", `/api/tags/${id}`, true);
    request.send();
  }

  next(action);
};
