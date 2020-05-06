const TRANSLATIONS_ACTIONS = {
  REQUEST: 'TRANSLATIONS_REQUEST',
  RECEIVE: 'TRANSLATIONS_RECEIVE',
};

const translationsActions = {
  request: (alias) => ({ type: TRANSLATIONS_ACTIONS.REQUEST, payload: { alias }}),
  receive: (alias, translation) => ({ type: TRANSLATIONS_ACTIONS.RECEIVE, payload: { translation, alias } }),
};

function translationsReducer(state = {}, action = {}) {
  if (action.type === TRANSLATIONS_ACTIONS.RECEIVE) {
    return {
      ...state,
      [action.payload.alias]: action.payload.translation,
    };
  }

  return state;
}

const translationsMiddleware = store => next => action => {
  if (action.type === TRANSLATIONS_ACTIONS.REQUEST) {
    const { alias } = action.payload;
    const state = store.getState();

    if (state.translations[alias] === undefined) {
      store.dispatch(translationsActions.receive(alias, ''));
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const translation = JSON.parse(request.responseText);
            store.dispatch(translationsActions.receive(alias, translation.value));
          } else {
            console.warn(`failed to fetch translation for ${alias}`);
          }
        }
      };
      request.open("GET", `/api/translation/${action.payload.alias}`, true);
      request.send();
    }
  }
  next(action);
};
