const initialState = { counter: 0 };
function reducerShim(state = initialState, action) {
  if (action.type === 'increment') {
    return { ...state, counter: state.counter + 1 };
  }
  return state;
}

(function (reducer) {
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
    // StateChange: ReduxStateChangeEvent,
  };

  let store;
  if (/.+\.localhost$/.test(location.hostname) || true) {
    store = Redux.createStore(reducer, window['__REDUX_DEVTOOLS_EXTENSION__'] && window['__REDUX_DEVTOOLS_EXTENSION__']());
  } else {
    store = Redux.createStore(reducer);
  }

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

  function dispatchListener(e) {
    e.stopPropagation();

    const prevState = cloneState(store.getState());
    store.dispatch(e.detail.action);
    const currentState = cloneState(store.getState());

    if (!shallowEqual(prevState, currentState)) {
      window.dispatchEvent(new ReduxStateChangeEvent({
        dispatch: store.dispatch,
        getState: store.getState,
      }));
    }
  }
  window.addEventListener(ReduxEventTypes.dispatch, dispatchListener);
})(reducerShim);
