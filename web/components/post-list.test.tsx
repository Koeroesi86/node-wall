// @vitest-environment jsdom
import { act, cleanup, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { fakeRedux } from '../test-utils/redux.ts';
import { PostList } from './post-list.tsx';

vi.mock('./post-preview.tsx', () => ({
  PostPreview: ({ postId }: { postId: string }) => createElement('post-preview', { 'post-id': postId }),
}));

let redux: ReturnType<typeof fakeRedux>;

const list = (posts: string[], extra = {}) => ({ postsList: { i1: { posts, isLoading: false, ...extra } } });
const ids = (element: Element) => [...element.querySelectorAll('post-preview')].map(node => node.getAttribute('post-id'));

const mount = () => {
  redux.setState({ bounds: { newest: null, oldest: null }, ...list([]) });
  const { container } = render(<PostList instance="i1" />);
  const element = container.firstElementChild as HTMLElement;
  const audio = element.querySelector('audio') as HTMLAudioElement;
  audio.play = vi.fn();

  return { element, audio };
};

const loadMore = { type: 'POSTS_LIST_LOAD_MORE', payload: { instance: 'i1' } };

beforeEach(() => {
  vi.useFakeTimers();
  redux = fakeRedux();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('post-list', () => {
  test('renders a loading indicator and an end marker', () => {
    const { element } = mount();

    expect(element.querySelector('.end .translate-text')?.textContent).toBe('post-list.loading');
  });

  test('loads more posts shortly after it is shown, and when scrolled', () => {
    const { element } = mount();
    redux.clearDispatched();

    act(() => vi.advanceTimersByTime(500));
    expect(redux.dispatched).toEqual([loadMore]);

    redux.clearDispatched();
    fireEvent.scroll(element);
    expect(redux.dispatched).toEqual([loadMore]);
  });

  test('renders the posts of its instance in order, before the end marker', () => {
    const { element } = mount();

    act(() => redux.setState({ bounds: { newest: null, oldest: null }, ...list(['a', 'b', 'c']) }));

    expect(ids(element)).toEqual(['a', 'b', 'c']);
    expect(element.lastElementChild?.classList.contains('end')).toBe(true);
  });

  test('adds new posts and removes the ones that are gone, without duplicates', () => {
    const { element } = mount();
    act(() => redux.setState({ bounds: { newest: null, oldest: null }, ...list(['a', 'b']) }));

    act(() => redux.setState({ bounds: { newest: null, oldest: null }, ...list(['z', 'a']) }));

    expect(ids(element)).toEqual(['z', 'a']);
    expect(element.querySelectorAll('post-preview[post-id="a"]')).toHaveLength(1);
  });

  test('ignores other instances', () => {
    const { element } = mount();

    act(() => redux.setState({ bounds: { newest: null, oldest: null }, postsList: { other: { posts: ['a'] } } }));

    expect(ids(element)).toEqual([]);
  });

  test('shows when it is loading', () => {
    const { element } = mount();
    const end = element.querySelector('.end') as HTMLElement;

    act(() => redux.setState({ bounds: { newest: null, oldest: null }, ...list([], { isLoading: true }) }));
    expect(end.classList.contains('loading')).toBe(true);

    act(() => redux.setState({ bounds: { newest: null, oldest: null }, ...list([], { isLoading: false }) }));
    expect(end.classList.contains('loading')).toBe(false);
  });

  test('asks for newer posts and plays a sound when the newest bound grows', () => {
    const { audio } = mount();
    act(() => vi.advanceTimersByTime(500));
    act(() => redux.setState({ bounds: { newest: 10, oldest: null }, ...list([]) }));
    redux.clearDispatched();

    act(() => redux.setState({ bounds: { newest: 20, oldest: null }, ...list([]) }));
    act(() => vi.advanceTimersByTime(2000));

    expect(audio.play).toHaveBeenCalledOnce();
    expect(redux.dispatched).toEqual([{ type: 'POSTS_LIST_LOAD_NEW', payload: { instance: 'i1' } }]);
  });

  test('loads more when the oldest bound changes', () => {
    mount();
    redux.clearDispatched();

    act(() => redux.setState({ bounds: { newest: 10, oldest: 1 }, ...list([]) }));

    expect(redux.dispatched).toContainEqual(loadMore);
  });

  test('stops listening when removed', () => {
    const { element } = mount();
    const dispatched = redux.dispatched.length;

    cleanup();
    redux.setState({ bounds: { newest: 10, oldest: 1 }, ...list(['a']) });

    expect(element.isConnected).toBe(false);
    expect(redux.dispatched).toHaveLength(dispatched);
  });
});
