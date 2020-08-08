const COMMENTS_ACTIONS = {
  REQUEST: 'COMMENTS_REQUEST',
  RECEIVE: 'COMMENTS_RECEIVE',
  CREATE: 'COMMENTS_CREATE',
};

const commentsActions = {
  request: (id) => ({ type: COMMENTS_ACTIONS.REQUEST, payload: { id } }),
  create: (id, body, parent) => ({ type: COMMENTS_ACTIONS.CREATE, payload: { id, parent, body } }),
};

function commentsReducer(state = {}, action = {}) {
  if (action.type === COMMENTS_ACTIONS.RECEIVE) {
    return {
      ...state,
      [action.payload.id]: action.payload,
    }
  }

  return state;
}

const commentsMiddleware = store => next => action => {
  if (action.type === COMMENTS_ACTIONS.REQUEST) {
    const { id } = action.payload;

    getComment(id).then(comment => {
      store.dispatch({
        type: COMMENTS_ACTIONS.RECEIVE,
        payload: comment,
      });
    });
  }

  if (action.type === COMMENTS_ACTIONS.CREATE) {
    const { id, parent, body } = action.payload;

    const tmpNode  = document.createElement('div');
    tmpNode.innerHTML = body;
    // [...tmpNode.querySelectorAll('span[tag-id]')].forEach(tagNode => {
    //   tagNode.replaceWith(`#!${tagNode.getAttribute('tag-id')}`)
    // });
    [...tmpNode.querySelectorAll('div')].forEach(divNode => {
      if (divNode.innerHTML === '<br>')  {
        divNode.replaceWith('\n\n');
      } else {
        divNode.replaceWith('\n' + divNode.innerHTML)
      }
    });

    tmpNode.innerHTML = tmpNode.innerHTML.replace(/\r/gi, '\n')

    createComment(id, tmpNode.innerHTML, parent).then(res => {
      console.log('createComment', res)
      location.reload(); // TODO: dynamic comment loading
    });
  }

  next(action);
};
