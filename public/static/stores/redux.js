const reducers = Redux.combineReducers({
  translations: translationsReducer,
  serviceWorker: serviceWorkerReducer,
  tags: tagsReducer,
  posts: postsReducer,
  postsList: postsListReducer,
  user: userReducer,
  links: linksReducer,
  bounds: boundsReducer,
  comments: commentsReducer,
});

const middlewares = [
  translationsMiddleware,
  serviceWorkerMiddleware,
  tagsMiddleware,
  postsMiddleware,
  userMiddleware,
  linksMiddleware,
  boundsMiddleware,
  postsMiddleware,
  postsListMiddleware,
  commentsMiddleware,
];

(function (reducer = s => s, m = [], g) {
  const ReduxEventTypes = {
    dispatch: 'dispatch',
    stateChange: 'state-change',
  };
  g.ReduxEventTypes = ReduxEventTypes;

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

  g.ReduxEvents = {
    Dispatch: ReduxDispatchEvent,
  };

  let composeEnhancers;
  if (g && g['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__']) { // /.+\.localhost$/.test(location.hostname)
    composeEnhancers = g['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'];
  } else {
    composeEnhancers = Redux.compose;
  }

  const enhancer = composeEnhancers(Redux.applyMiddleware(...m));

  const store = Redux.createStore(reducer, g['__STATE__'] || {}, enhancer);
  delete g['__STATE__'];

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

  g.shallowEqual = function (a, b) {
    return shallowEqual(a, b);
  }

  const connectedListeners = [];
  g.connectRedux = (mapState = () => {}, connectDispatch = () => {}) => {
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
  g.disconnectRedux = (mapState) => {
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
      if (window) {
        window.dispatchEvent(new ReduxStateChangeEvent({
          dispatch: store.dispatch,
          getState: store.getState,
        }));
      }

      connectedListeners.forEach(mapState => {
        try {
          mapState(currentState, previousState);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }
  store.subscribe(handleChange);

  if (window){
    function dispatchListener(e) {
      e.stopPropagation();
      store.dispatch(e.detail.action);
    }
    window.addEventListener(ReduxEventTypes.dispatch, dispatchListener);
  }
})(reducers, middlewares, window || global || module.exports);
