// @vitest-environment jsdom
import { act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { fakeRedux } from '../test-utils/redux.ts';
import { TagPage } from './tag-page.tsx';

let redux: ReturnType<typeof fakeRedux>;

const state = (tags = {}) => ({ tags, posts: {}, postsList: {}, bounds: { newest: null, oldest: null } });

beforeEach(() => {
  redux = fakeRedux();
  redux.setState(state());
});

afterEach(cleanup);

describe('tag-page', () => {
  test('prepares a list filtered by the tag, requests the tag and loads posts', () => {
    render(<TagPage tagId="t1" />);

    expect(redux.dispatched).toEqual([
      { type: 'POSTS_LIST_CREATE_FILTER', payload: { instance: 't1', likedTags: ['t1'], dislikedTags: [] } },
      { type: 'TAG_REQUEST', payload: { id: 't1' } },
      { type: 'POSTS_LIST_LOAD_MORE', payload: { instance: 't1' } },
    ]);
  });

  test('renders the tag name and its list once the tag is known', () => {
    const { container } = render(<TagPage tagId="t1" />);
    expect(container.querySelector('h2')).toBeNull();

    act(() => redux.setState(state({ t1: { id: 't1', name: 'news' } })));

    expect(container.querySelector('h2')?.textContent).toBe('#news');
    expect(container.querySelector('.post-list')).not.toBeNull();
  });

  test('shows the name the server knows right away', () => {
    const { container } = render(<TagPage tagId="t1" tagName="news" />);

    expect(container.querySelector('h2')?.textContent).toBe('#news');
  });

  test('does not re-render the list for an unchanged name', () => {
    const { container } = render(<TagPage tagId="t1" />);
    act(() => redux.setState(state({ t1: { id: 't1', name: 'news' } })));
    const list = container.querySelector('.post-list');

    act(() => redux.setState(state({ t1: { id: 't1', name: 'news' } })));

    expect(container.querySelector('.post-list')).toBe(list);
  });

  test('does not render the name as markup', () => {
    const { container } = render(<TagPage tagId="t1" tagName="<img src=x>" />);

    expect(container.querySelector('h2 img')).toBeNull();
  });
});
