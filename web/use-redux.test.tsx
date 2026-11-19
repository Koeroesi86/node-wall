// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fakeRedux } from './test-utils/redux.ts';
import { useRedux } from './use-redux.ts';

let redux: ReturnType<typeof fakeRedux>;

beforeEach(() => {
  redux = fakeRedux();
  redux.setState({ tags: {} });
});

afterEach(cleanup);

describe('useRedux', () => {
  test('gives the state of the store once connected, and every change after', () => {
    const { result } = renderHook(() => useRedux());
    expect(result.current.state).toEqual({ tags: {} });

    act(() => redux.setState({ tags: { t1: { id: 't1', name: 'news' } } }));

    expect(result.current.state).toEqual({ tags: { t1: { id: 't1', name: 'news' } } });
  });

  test('tells the listener the previous state, which is none for the first one', () => {
    const onChange = vi.fn();
    renderHook(() => useRedux(onChange));
    expect(onChange).toHaveBeenLastCalledWith({ tags: {} }, undefined);

    act(() => redux.setState({ tags: { t1: {} } }));

    expect(onChange).toHaveBeenLastCalledWith({ tags: { t1: {} } }, { tags: {} });
  });

  test('dispatches to the store', () => {
    const { result } = renderHook(() => useRedux());

    result.current.dispatch({ type: 'X', payload: 1 });

    expect(redux.dispatched).toEqual([{ type: 'X', payload: 1 }]);
  });

  test('stops listening when it is unmounted', () => {
    const onChange = vi.fn();
    const { unmount } = renderHook(() => useRedux(onChange));
    unmount();
    onChange.mockClear();

    redux.setState({ tags: { t1: {} } });

    expect(onChange).not.toHaveBeenCalled();
  });
});
