// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fakeRedux } from '../test-utils/redux.ts';
import { PostWall } from './post-wall.tsx';

let redux: ReturnType<typeof fakeRedux>;

beforeEach(() => {
  redux = fakeRedux();
  redux.setState({ bounds: { newest: null, oldest: null }, postsList: {}, user: { role: 'guest', tags: null } });
});

afterEach(cleanup);

describe('post-wall', () => {
  test('creates an unfiltered list and loads the tag preferences of the user', () => {
    const { container } = render(<PostWall instance="i1" />);

    expect(redux.dispatched).toEqual([
      { type: 'POSTS_LIST_CREATE_FILTER', payload: { instance: 'i1', likedTags: [], dislikedTags: [] } },
      { type: 'USER_REQUEST_TAGS', payload: {} },
    ]);
    expect(container.querySelector('.compose-post')).not.toBeNull();
  });

  test('applies the tag preferences once they are known and shows the list', () => {
    const { container } = render(<PostWall instance="i1" />);
    act(() => redux.setState({ bounds: { newest: null, oldest: null }, postsList: { i1: {} }, user: { role: 'user', tags: [] } }));
    redux.clearDispatched();

    act(() => redux.setState({
      bounds: { newest: null, oldest: null }, postsList: { i1: {} },
      user: { role: 'user', tags: [{ tag_id: 'a', type: 'liked' }, { tag_id: 'b', type: 'disliked' }] },
    }));

    expect(redux.dispatched).toEqual([
      { type: 'POSTS_LIST_SET_FILTER_TAGS', payload: { instance: 'i1', likedTags: ['a'], dislikedTags: ['b'] } },
    ]);
    expect(container.querySelectorAll('.post-list')).toHaveLength(1);
    expect(container.querySelector('.post-list')).not.toBeNull();
  });

  test('creates the filter when the list does not exist yet, and adds the list only once', () => {
    const { container } = render(<PostWall instance="i1" />);
    act(() => redux.setState({ bounds: { newest: null, oldest: null }, postsList: {}, user: { role: 'user', tags: [] } }));
    redux.clearDispatched();

    act(() => redux.setState({ bounds: { newest: null, oldest: null }, postsList: {}, user: { role: 'user', tags: [{ tag_id: 'a', type: 'liked' }] } }));
    act(() => redux.setState({ bounds: { newest: null, oldest: null }, postsList: {}, user: { role: 'user', tags: [{ tag_id: 'a', type: 'disliked' }] } }));

    expect(redux.dispatched[0]).toMatchObject({ type: 'POSTS_LIST_CREATE_FILTER' });
    expect(container.querySelectorAll('.post-list')).toHaveLength(1);
  });
});
