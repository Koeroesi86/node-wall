const reducers = Redux.combineReducers({
  translations: translationsReducer,
  serviceWorker: serviceWorkerReducer,
  tags: tagsReducer,
  posts: postsReducer,
  user: userReducer,
  links: linksReducer,
});

const middlewares = [
  translationsMiddleware,
  serviceWorkerMiddleware,
  tagsMiddleware,
  postsMiddleware,
  userMiddleware,
  linksMiddleware,
];

(function (reducer = s => s, m = []) {
  const ReduxEventTypes = {
    dispatch: 'dispatch',
    stateChange: 'state-change',
  };
  window.ReduxEventTypes = ReduxEventTypes;

  class ReduxDispatchEvent extends CustomEvent {
    /** @param {Object} action */
    constructor(action) {
      super(ReduxEventTypes.dispatch, { bubbles: true, detail: { action } });
    }
  }

  class ReduxStateChangeEvent extends CustomEvent {
    /** @type {{ dispatch: Function, getState: Function }} store */
    constructor(store) {
      super(ReduxEventTypes.stateChange, { bubbles: false, detail: { store } });
    }
  }

  window.ReduxEvents = {
    Dispatch: ReduxDispatchEvent,
  };

  let store;
  let composeEnhancers;
  if (window && window['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__']) { // /.+\.localhost$/.test(location.hostname)
    composeEnhancers = window['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'];
  } else {
    composeEnhancers = Redux.compose;
  }

  const enhancer = composeEnhancers(Redux.applyMiddleware(...m));

  store = Redux.createStore(reducer, enhancer);

  const cloneState = a => a; // safer but slower: JSON.stringify;

  function is(x, y) {
    if (x === y) {
      return x !== 0 || y !== 0 || 1 / x === 1 / y
    } else {
      return x !== x && y !== y
    }
  }

  function shallowEqual(objA, objB) {
    if (is(objA, objB)) return true

    if (
      typeof objA !== 'object' ||
      objA === null ||
      typeof objB !== 'object' ||
      objB === null
    ) {
      return false
    }

    const keysA = Object.keys(objA)
    const keysB = Object.keys(objB)

    if (keysA.length !== keysB.length) return false

    for (let i = 0; i < keysA.length; i++) {
      if (
        !Object.prototype.hasOwnProperty.call(objB, keysA[i]) ||
        !is(objA[keysA[i]], objB[keysA[i]])
      ) {
        return false
      }
    }

    return true
  }

  const connectedListeners = [];
  window.connectRedux = (mapState = () => {}, connectDispatch = () => {}) => {
    if (!connectedListeners.includes(mapState)) {
      connectedListeners.push(mapState);
      try {
        connectDispatch(store.dispatch);
        mapState(store.getState());
      } catch (e) {
        console.error(e);
      }
    }
  };
  window.disconnectRedux = (mapState) => {
    const index = connectedListeners.indexOf(mapState);
    if (index !== -1) {
      connectedListeners.splice(index, 1);
    }
  };

  let currentState;
  function handleChange() {
    let previousState = currentState;
    currentState = cloneState(store.getState());

    if (!shallowEqual(previousState, currentState)) {
      window.dispatchEvent(new ReduxStateChangeEvent({
        dispatch: store.dispatch,
        getState: store.getState,
      }));

      connectedListeners.forEach(mapState => {
        try {
          mapState(store.getState());
        } catch (e) {
          console.error(e);
        }
      });
    }
  }
  store.subscribe(handleChange);

  function dispatchListener(e) {
    e.stopPropagation();
    store.dispatch(e.detail.action);
  }
  window.addEventListener(ReduxEventTypes.dispatch, dispatchListener);
})(reducers, middlewares);
