import { loadBrowser } from './browser';

const stores = ['serviceWorker', 'translations', 'tags', 'posts', 'bounds', 'postsList', 'user', 'comments', 'links']
  .map(name => `public/static/stores/${name}.ts`);

/** What the redux store provides to components, with the dispatches and the state under test control. */
const reduxFake = `
var ReduxEventTypes = { dispatch: 'dispatch', stateChange: 'state-change' };
class ReduxDispatchEvent extends CustomEvent {
  constructor(action) { super('dispatch', { bubbles: true, detail: { action } }); }
}
var ReduxEvents = { Dispatch: ReduxDispatchEvent };
const __redux = {
  state: {},
  listeners: [],
  dispatched: [],
  setState(next) {
    const previous = this.state;
    this.state = next;
    this.listeners.slice().forEach(listener => listener(next, previous));
  },
};
function connectRedux(mapState = () => {}, connectDispatch = () => {}) {
  if (!__redux.listeners.includes(mapState)) {
    __redux.listeners.push(mapState);
    try {
      connectDispatch(action => __redux.dispatched.push(action));
      mapState(__redux.state);
    } catch (e) {
      console.error(e);
    }
  }
}
function disconnectRedux(mapState) {
  const index = __redux.listeners.indexOf(mapState);
  if (index !== -1) __redux.listeners.splice(index, 1);
}
`;

export const emptyState = {
  translations: {},
  tags: {},
  posts: {},
  postsList: {},
  comments: {},
  links: {},
  bounds: { newest: null, oldest: null },
  user: { session: null, received: false, tags: null, role: 'guest' },
};

type State = Record<string, unknown>;

/**
 * Loads custom elements into a jsdom page together with the shared scripts they rely on
 * (action creators, post/comment utils) and a fake redux store.
 */
export async function loadComponents(components: string[], options: { html?: string; utils?: string[] } = {}) {
  const { html = '<!doctype html><html><head></head><body></body></html>', utils = ['post', 'comments'] } = options;
  const browser = await loadBrowser(
    [
      ...utils.map(name => `public/static/utils/${name}.ts`),
      ...stores,
      'public/static/components/_component.ts',
      ...components.map(name => `public/static/components/${name}.ts`),
    ],
    html,
    reduxFake,
  );
  let state: State = { ...emptyState };
  browser.evaluate(`__redux.state = ${JSON.stringify(state)}`);

  const redux = {
    /** Replaces slices of the state and notifies the connected components, like a store update would. */
    setState: (patch: State) => {
      state = { ...state, ...patch };
      browser.evaluate(`__redux.setState(${JSON.stringify(state)})`);
    },
    /** Sets the state components see when they connect, without notifying anyone. */
    preloadState: (patch: State) => {
      state = { ...state, ...patch };
      browser.evaluate(`__redux.state = ${JSON.stringify(state)}`);
    },
    dispatched: (): { type: string; payload?: Record<string, unknown> }[] => JSON.parse(browser.evaluate('JSON.stringify(__redux.dispatched)')),
    clearDispatched: () => browser.evaluate('__redux.dispatched.length = 0'),
    listenerCount: (): number => browser.evaluate('__redux.listeners.length'),
  };

  return {
    ...browser,
    redux,
    /** Adds markup to the page (connecting its elements) and returns the first element of it. */
    mount: (markup: string) => {
      const container = browser.document.createElement('div');
      browser.document.body.append(container);
      container.innerHTML = markup;
      return container.firstElementChild as HTMLElement;
    },
  };
}

export type ComponentsBrowser = Awaited<ReturnType<typeof loadComponents>>;
