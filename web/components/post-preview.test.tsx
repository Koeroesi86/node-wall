// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fakeRedux } from '../test-utils/redux.ts';
import { PostPreview } from './post-preview.tsx';

let redux: ReturnType<typeof fakeRedux>;

const post = (extra = {}) => ({ id: 'p1', content: 'hello\nworld', tags: [], created_at: 1700000000000, owner: null, ...extra });

const mount = () => {
  const { container, rerender } = render(<PostPreview postId="p1" />);

  return { element: container.firstElementChild as HTMLElement, rerender };
};

beforeEach(() => {
  vi.useFakeTimers();
  redux = fakeRedux();
  redux.setState({ posts: {} });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('post-preview', () => {
  test('requests its post when shown and when the id changes', () => {
    const { rerender } = mount();
    expect(redux.dispatched).toEqual([{ type: 'POSTS_REQUEST', payload: { id: 'p1' } }]);

    redux.clearDispatched();
    rerender(<PostPreview postId="p2" />);
    expect(redux.dispatched).toEqual([{ type: 'POSTS_REQUEST', payload: { id: 'p2' } }]);
  });

  test('renders content, date link and tags of the post', () => {
    const { element } = mount();

    act(() => redux.setState({ posts: { p1: post({ tags: [{ id: 't1' }, { id: 't2' }] }) } }));

    expect([...element.querySelectorAll('.content .contentLine')].map(line => line.textContent)).toEqual(['hello', 'world']);
    expect(element.querySelector('.date')?.getAttribute('href')).toBe('/post/p1');
    expect(element.querySelector('.date')?.textContent).not.toBe('');
    expect([...element.querySelectorAll('.tags tag-inline')].map(tag => tag.getAttribute('tag-id'))).toEqual(['t1', 't2']);
    expect(element.classList.contains('noTags')).toBe(false);
  });

  test('marks posts without tags', () => {
    const { element } = mount();
    act(() => redux.setState({ posts: { p1: post() } }));
    expect(element.classList.contains('noTags')).toBe(true);
  });

  test('shows the owner name, or "unknown user" when it has none', () => {
    const { element } = mount();

    act(() => redux.setState({ posts: { p1: post({ owner: { id: 'u1', name: 'Ann' } }) } }));
    expect(element.querySelector('.owner')?.textContent).toContain('Ann');

    act(() => redux.setState({ posts: { p1: post({ owner: { id: 'u1', name: 'null' }, content: 'changed' }) } }));
    expect(element.querySelector('.owner translate-text[alias="post-preview.unknown-user"]')).not.toBeNull();

    act(() => redux.setState({ posts: { p1: post({ owner: null, content: 'again' }) } }));
    expect(element.querySelector('.owner')?.innerHTML).toBe('');
  });

  test('does not render the owner name as HTML', () => {
    const { element } = mount();

    act(() => redux.setState({ posts: { p1: post({ owner: { id: 'u1', name: '<img src=x onerror=alert(1)>' } }) } }));

    expect(element.querySelector('.owner img')).toBeNull();
  });

  test('ignores other posts', () => {
    const { element } = mount();
    act(() => redux.setState({ posts: { p2: post({ id: 'p2' }) } }));
    expect(element.querySelector('.content')?.innerHTML).toBe('');
  });

  test('marks long content, and expands it on request', () => {
    const { element } = mount();
    const content = element.querySelector('.content') as HTMLElement;
    Object.defineProperty(content, 'scrollHeight', { configurable: true, value: 300 });
    act(() => redux.setState({ posts: { p1: post() } }));
    act(() => vi.advanceTimersByTime(0));
    expect(element.classList.contains('long')).toBe(true);

    fireEvent.click(element.querySelector('.contentToggle') as HTMLElement);

    expect(content.style.maxHeight).toBe('300px');
    act(() => vi.advanceTimersByTime(300));
    expect(element.classList.contains('showAll')).toBe(true);
  });

  test('stops listening when removed', () => {
    const { element } = mount();
    cleanup();
    redux.setState({ posts: { p1: post() } });
    expect(element.isConnected).toBe(false);
  });
});
