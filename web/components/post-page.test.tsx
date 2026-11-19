// @vitest-environment jsdom
import { act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { fakeRedux } from '../test-utils/redux.ts';
import { PostPage } from './post-page.tsx';

let redux: ReturnType<typeof fakeRedux>;

const post = (extra = {}) => ({ id: 'p1', content: 'hello\nworld', tags: [], created_at: 1700000000000, owner: null, ...extra });
const state = (posts = {}) => ({ posts, comments: {}, tags: {}, links: {}, user: { role: 'guest', tags: [] } });

beforeEach(() => {
  redux = fakeRedux();
  redux.setState(state());
});

afterEach(cleanup);

describe('post-page', () => {
  test('requests the post and embeds its comments', () => {
    const { container } = render(<PostPage postId="p1" />);

    expect(redux.dispatched[0]).toEqual({ type: 'POSTS_REQUEST', payload: { id: 'p1' } });
    expect(container.querySelector('.post-comments')).not.toBeNull();
  });

  test('renders the post once it arrives', () => {
    const { container } = render(<PostPage postId="p1" />);

    act(() => redux.setState(state({ p1: post({ tags: [{ id: 't1' }], owner: { id: 'u1', name: 'Ann' } }) })));

    expect([...container.querySelectorAll('.postContent .contentLine')].map(line => line.textContent)).toEqual(['hello', 'world']);
    expect(container.querySelector('.sentDate .x-icon')).not.toBeNull();
    expect(container.querySelectorAll('.tags .tag-inline')).toHaveLength(1);
    expect(container.querySelector('.owner')?.textContent).toContain('Ann');
  });

  test('renders posts without an owner and with an unknown owner name', () => {
    const { container } = render(<PostPage postId="p1" />);

    act(() => redux.setState(state({ p1: post() })));
    expect(container.querySelector('.owner')?.innerHTML).toBe('');

    act(() => redux.setState(state({ p1: post({ content: 'x', owner: { id: 'u1', name: '' } }) })));
    expect(container.querySelector('.owner')?.textContent).toContain('post-preview.unknown-user');
  });
});
