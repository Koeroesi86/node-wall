import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadBrowser, type Browser } from '../../../lib/test-utils/browser';
import { reduxStub } from '../../../lib/test-utils/reduxStub';

const files = [
  ...['serviceWorker', 'translations', 'tags', 'posts', 'bounds', 'postsList', 'user', 'comments', 'links'].map(name => `public/static/stores/${name}.ts`),
  'public/static/stores/redux.ts',
];

type State = Record<string, any>;
type Listener = (state: State, previous?: State) => void;

let browser: Browser;

const page = '<!doctype html><html><head><meta name="x-session-id" content=""></head><body></body></html>';

const boot = async (initialState?: object) => {
  const state = initialState ? `window.__STATE__ = ${JSON.stringify(initialState)};` : '';
  browser = await loadBrowser(files, page, `${reduxStub}\n${state}`);
};

const call = <T>(code: string) => browser.evaluate<T>(code);
const dispatch = (action: object) => browser.window.dispatchEvent(new (call<new (action: object) => Event>('ReduxEvents.Dispatch'))(action));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  browser?.close();
  vi.restoreAllMocks();
});

describe('shallowEqual', () => {
  beforeEach(() => boot());
  const equal = (a: unknown, b: unknown) => browser.evaluate<(a: unknown, b: unknown) => boolean>('shallowEqual')(a, b);

  test.each([
    [1, 1, true],
    [NaN, NaN, true],
    [0, -0, false],
    [null, null, true],
    [null, {}, false],
    ['a', 'b', false],
    [{ a: 1 }, { a: 1 }, true],
    [{ a: 1 }, { a: 2 }, false],
    [{ a: 1 }, { a: 1, b: 2 }, false],
    [{ a: 1 }, { b: 1 }, false],
    [{ a: {} }, { a: {} }, false],
  ])('shallowEqual(%j, %j) is %s', (a, b, expected) => {
    expect(equal(a, b)).toBe(expected);
  });
});

describe('the store', () => {
  test('starts from the server rendered state and removes it from the window', async () => {
    await boot({ tags: { t1: { name: 'news' } } });
    const mapState = vi.fn();

    browser.evaluate<(listener: Listener) => void>('connectRedux')(mapState);

    expect(mapState.mock.calls[0][0].tags).toEqual({ t1: { name: 'news' } });
    expect(Object.prototype.hasOwnProperty.call(browser.window, '__STATE__')).toBe(false);
  });

  test('exposes the event types and the dispatch event', async () => {
    await boot();
    expect(call('ReduxEventTypes')).toEqual({ dispatch: 'dispatch', stateChange: 'state-change' });
    const event = new (call<new (action: object) => CustomEvent>('ReduxEvents.Dispatch'))({ type: 'X' });
    expect(event.type).toBe('dispatch');
    expect(event.bubbles).toBe(true);
    expect(event.detail).toEqual({ action: { type: 'X' } });
  });

  test('has the state of every store', async () => {
    await boot();
    const mapState = vi.fn();
    call<(l: Listener) => void>('connectRedux')(mapState);
    expect(Object.keys(mapState.mock.calls[0][0]).sort()).toEqual(
      ['bounds', 'comments', 'links', 'posts', 'postsList', 'serviceWorker', 'tags', 'translations', 'user'],
    );
  });
});

describe('connectRedux', () => {
  beforeEach(() => boot());

  test('calls the listener with the current state and gives access to dispatch', () => {
    const mapState = vi.fn();
    const connectDispatch = vi.fn();

    call<(l: Listener, d: (dispatch: unknown) => void) => void>('connectRedux')(mapState, connectDispatch);

    expect(mapState).toHaveBeenCalledOnce();
    expect(connectDispatch).toHaveBeenCalledWith(expect.any(Function));
  });

  test('connects a listener only once', () => {
    const mapState = vi.fn();
    const connect = call<(l: Listener) => void>('connectRedux');
    connect(mapState);
    connect(mapState);
    expect(mapState).toHaveBeenCalledOnce();
  });

  test('notifies listeners with the new and previous state after a change', () => {
    const mapState = vi.fn();
    call<(l: Listener) => void>('connectRedux')(mapState);
    mapState.mockClear();

    dispatch({ type: 'TAG_RECEIVE', payload: { id: 't1', tag: { name: 'news' } } });

    expect(mapState).toHaveBeenCalledOnce();
    const [state, previous] = mapState.mock.calls[0];
    expect(state.tags).toEqual({ t1: { name: 'news' } });
    expect(previous === undefined || previous.tags !== state.tags).toBe(true);
  });

  test('does not notify when nothing changed', () => {
    const mapState = vi.fn();
    call<(l: Listener) => void>('connectRedux')(mapState);
    dispatch({ type: 'UNKNOWN' }); // the first dispatch always reports, there is no previous state yet
    mapState.mockClear();

    dispatch({ type: 'UNKNOWN' });

    expect(mapState).not.toHaveBeenCalled();
  });

  test('stops notifying after disconnectRedux', () => {
    const mapState = vi.fn();
    call<(l: Listener) => void>('connectRedux')(mapState);
    call<(l: Listener) => void>('disconnectRedux')(mapState);
    mapState.mockClear();

    dispatch({ type: 'TAG_RECEIVE', payload: { id: 't1', tag: {} } });

    expect(mapState).not.toHaveBeenCalled();
  });

  test('a failing listener does not break the others', () => {
    const failing = vi.fn(() => {
      throw new Error('boom');
    });
    const healthy = vi.fn();
    const connect = call<(l: Listener) => void>('connectRedux');
    connect(failing);
    connect(healthy);
    failing.mockClear();
    healthy.mockClear();

    dispatch({ type: 'TAG_RECEIVE', payload: { id: 't1', tag: {} } });

    expect(healthy).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalled();
  });

  test('announces state changes on the window', () => {
    const onChange = vi.fn();
    browser.window.addEventListener('state-change', onChange);

    dispatch({ type: 'TAG_RECEIVE', payload: { id: 't1', tag: {} } });

    expect(onChange).toHaveBeenCalledOnce();
    expect((onChange.mock.calls[0][0] as CustomEvent).detail.store.getState().tags).toHaveProperty('t1');
  });
});
