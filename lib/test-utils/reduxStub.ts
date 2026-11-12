/**
 * A minimal implementation of the Redux API the app uses (the real one comes from a CDN script),
 * evaluated inside the browser harness.
 */
export const reduxStub = `
const Redux = {
  combineReducers: reducers => (state = {}, action) => Object.fromEntries(
    Object.entries(reducers).map(([key, reducer]) => [key, reducer(state[key], action)])
  ),
  compose: (...fns) => (fns.length ? fns.reduce((a, b) => (...args) => a(b(...args))) : value => value),
  applyMiddleware: (...middlewares) => createStore => (reducer, state) => {
    const store = createStore(reducer, state);
    let dispatch = store.dispatch;
    const api = { getState: store.getState, dispatch: action => dispatch(action) };
    dispatch = middlewares.map(middleware => middleware(api)).reduceRight((next, middleware) => middleware(next), store.dispatch);
    return { ...store, dispatch };
  },
  createStore: (reducer, state, enhancer) => {
    if (enhancer) return enhancer(Redux.createStore)(reducer, state);
    let current = reducer(state, { type: '@@INIT' });
    const listeners = [];
    return {
      getState: () => current,
      dispatch: action => {
        current = reducer(current, action);
        listeners.slice().forEach(listener => listener());
        return action;
      },
      subscribe: listener => {
        listeners.push(listener);
        return () => listeners.splice(listeners.indexOf(listener), 1);
      },
    };
  },
};
`;
