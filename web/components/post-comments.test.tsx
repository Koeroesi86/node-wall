// @vitest-environment jsdom
import { act, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { fakeRedux } from '../test-utils/redux.ts';
import { PostComments } from './post-comments.tsx';

let redux: ReturnType<typeof fakeRedux>;

beforeEach(() => {
  redux = fakeRedux();
  redux.setState({ posts: {}, comments: {} });
});

afterEach(cleanup);

describe('post-comments', () => {
  test('sends the written comment', () => {
    const { container } = render(<PostComments postId="p1" />);
    container.querySelector('.body')!.innerHTML = '<div>hi</div>';
    redux.clearDispatched();

    fireEvent.click(container.querySelector('.send') as HTMLElement);

    expect(redux.dispatched).toEqual([{ type: 'COMMENTS_CREATE', payload: { id: 'p1', parent: null, body: '<div>hi</div>' } }]);
  });

  test('lists the comments of the post once, without duplicates', () => {
    const { container } = render(<PostComments postId="p1" />);

    act(() => redux.setState({ posts: { p1: { comments: ['c1', 'c2'] } }, comments: {} }));
    act(() => redux.setState({ posts: { p1: { comments: ['c1', 'c2', 'c3'] } }, comments: {} }));

    const items = [...container.querySelectorAll('.post-comments-item')];
    expect(items.map(item => item.id)).toEqual(['comment-c1', 'comment-c2', 'comment-c3']);
  });

  test('says when there are no comments', () => {
    const { container } = render(<PostComments postId="p1" />);

    act(() => redux.setState({ posts: { p1: { comments: [] } }, comments: {} }));

    expect(container.querySelector('.commentsList')?.textContent).toBe('post-comments.no-comments');
  });

  test('waits for the post to load', () => {
    const { container } = render(<PostComments postId="p1" />);

    act(() => redux.setState({ posts: { p1: { content: '' } }, comments: {} }));

    expect(container.querySelector('.commentsList')?.innerHTML).toBe('');
  });
});
