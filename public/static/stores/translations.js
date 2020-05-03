function translationsReducer(state = {}, action = {}) {
  if (action.type === 'receive-translation') {
    return {
      ...state,
      [action.payload.alias]: action.payload.translation,
    };
  }

  return state;
}

function requestedTranslationsReducer(state = {}, action = {}) {
  if (action.type === 'request-translation') {
    return {
      ...state,
      [action.payload.alias]: true,
    };
  }

  return state;
}

const translationsMiddleware = store => next => action => {
  if (action.type === 'request-translation') {
    const { alias } = action.payload;
    const state = store.getState();

    if (state.translations[alias] === undefined && !state.requestedTranslations[alias]) {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const translation = JSON.parse(request.responseText);
            store.dispatch({
              type: 'receive-translation',
              payload: { translation: translation.value, alias }
            });
          } else {
            console.warn(`failed to fetch translation for ${alias}`);
            store.dispatch({
              type: 'receive-translation',
              payload: { translation: '', alias }
            });
          }
        }
      };
      request.open("GET", `/api/translation/${action.payload.alias}`, true);
      request.send();
    }
  }
  next(action);
};
