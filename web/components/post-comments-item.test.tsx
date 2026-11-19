// @vitest-environment jsdom
import { act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { fakeRedux } from '../test-utils/redux.ts';
import { PostCommentsItem } from './post-comments-item.tsx';

let redux: ReturnType<typeof fakeRedux>;

beforeEach(() => {
  redux = fakeRedux();
  redux.setState({ comments: {} });
});

afterEach(cleanup);

describe('post-comments-item', () => {
  test('requests its comment and renders it when it arrives', () => {
    const { container } = render(<PostCommentsItem commentId="c1" />);
    const element = container.firstElementChild as HTMLElement;

    expect(redux.dispatched).toEqual([{ type: 'COMMENTS_REQUEST', payload: { id: 'c1' } }]);
    expect(element.id).toBe('comment-c1');
    expect(element.querySelector('.createdAt')?.getAttribute('href')).toBe('#comment-c1');

    act(() => redux.setState({ comments: { c1: { id: 'c1', body: 'line1\nline2', created_at: Date.UTC(2024, 0, 2) } } }));

    expect(element.querySelector('.body')?.innerHTML).toBe('<div class="line">line1</div><div class="line">line2</div>');
    expect(element.querySelector('.createdAt')?.textContent).not.toBe('');
  });

  test('ignores other comments', () => {
    const { container } = render(<PostCommentsItem commentId="c1" />);

    act(() => redux.setState({ comments: { c2: { id: 'c2', body: 'x', created_at: 1 } } }));

    expect(container.querySelector('.body')?.innerHTML).toBe('');
  });
});
