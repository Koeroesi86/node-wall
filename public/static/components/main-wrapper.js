const ReduxEvents = {
  dispatch: 'dispatch',
  stateChange: 'state-change',
};

class ReduxDispatchEvent extends CustomEvent {
  constructor(action) {
    super(ReduxEvents.dispatch, { bubble: true, detail: { action } });
  }
}

class ReduxStateChangeEvent extends CustomEvent {
  constructor(store) {
    super(ReduxEvents.stateChange, { bubble: false, detail: { store } });
  }
}

const initialState = { counter: 0 };
function reducerShim(state = initialState, action) {
  if (action.type === 'increment') {
    return { ...state, counter: state.counter + 1 };
  }
  return state;
}

(function (reducer) {
  let store;
  if (/.+\.localhost$/.test(location.hostname) || true) {
    store = Redux.createStore(reducer, window['__REDUX_DEVTOOLS_EXTENSION__'] && window['__REDUX_DEVTOOLS_EXTENSION__']());
  } else {
    store = Redux.createStore(reducer);
  }

  const cloneState = JSON.stringify;
  function dispatchListener(e) {
    e.stopPropagation();

    const prevState = cloneState(store.getState());
    store.dispatch(e.detail.action);
    const currentState = cloneState(store.getState());

    if (prevState !== currentState) {
      this.dispatchEvent(new ReduxStateChangeEvent({
        dispatch: store.dispatch,
        getState: store.getState,
      }));
    }
  }
  window.addEventListener(ReduxEvents.dispatch, dispatchListener);

  // test increment event
  window.addEventListener('click', () => {
    window.dispatchEvent(new ReduxDispatchEvent({ type: 'increment' }));
  });
})(reducerShim);


class MainWrapper extends Component {
  static styleSheet = '/static/components/main-wrapper.css';

  // connectedCallback() {
  //   window.addEventListener(ReduxEvents.stateChange, e => {
  //     console.log(ReduxEvents.stateChange, e)
  //   });
  // }
}

window.customElements.define('main-wrapper', MainWrapper);
