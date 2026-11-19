// @vitest-environment jsdom
import { act, cleanup, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fakeApiSchemas } from '../test-utils/api-schemas.ts';
import { fakeFetch } from '../test-utils/fetch.ts';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { ModerationPage } from './moderation-page.tsx';

vi.mock('./post-preview.tsx', () => ({
  PostPreview: ({ postId }: { postId: string }) => createElement('div', { className: 'post-preview', 'data-post-id': postId }),
}));

const TAG_ID = '11111111-2222-3333-4444-555555555555';
const pending = [{ id: 'p1', type: 'post', created_at: 100 }];
const details = { tags: [], content: 'hello #fresh' };

const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const mount = async (posts: unknown[] = pending, extraRoutes = {}) => {
  const calls = fakeFetch({
    'GET /api/posts?status=pending': { body: posts },
    'GET /api/posts/p1': { body: details },
    ...extraRoutes,
  });
  const { container } = render(<ModerationPage />);
  await settle();
  await settle();

  return { element: container.firstElementChild as HTMLElement, calls };
};

beforeEach(() => {
  vi.useFakeTimers();
  fakeApiSchemas();
  vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  Object.assign(window, { Tribute: class { attach() {} detach() {} } });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('moderation-page', () => {
  test('lists pending posts for moderation', async () => {
    const { element } = await mount();

    expect(element.querySelector('.loading')?.classList.contains('hidden')).toBe(true);
    const wrapper = element.querySelector('.postModerationWrapper');
    expect(wrapper?.getAttribute('post-id')).toBe('p1');
    expect(wrapper?.querySelector('.post-tags-input')).not.toBeNull();
  });

  test('suggests creating tags that are written in the post but do not exist', async () => {
    const { element } = await mount();

    expect(element.querySelector('.newTags')?.hasAttribute('hidden')).toBe(false);
    expect(element.querySelector('.newTagsItem .label')?.textContent).toBe('#fresh');
  });

  test('says when there is nothing to moderate', async () => {
    const { element } = await mount([]);

    expect(element.querySelector('.noPostsMessage')).not.toBeNull();
  });

  test('polls for newer posts every five seconds', async () => {
    const { calls } = await mount();
    calls.length = 0;

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

    expect(calls[0].url).toBe('/api/posts?status=pending&since=101');
  });

  test('does not duplicate posts it already shows', async () => {
    const { element } = await mount();

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

    expect(element.querySelectorAll('.postModerationWrapper')).toHaveLength(1);
  });

  test('refuses to approve a post without tags', async () => {
    const { element, calls } = await mount();
    calls.length = 0;

    fireEvent.click(element.querySelector('.approve') as HTMLElement);

    expect(window.alert).toHaveBeenCalledWith('moderation-page.posts.no-tags-alert');
    expect(calls).toHaveLength(0);
  });

  test('approves a tagged post', async () => {
    const { element, calls } = await mount(pending, {
      'GET /api/posts/p1': { body: { content: 'hello', tags: [{ id: TAG_ID, name: 'news' }] } },
      [`GET /api/tags/${TAG_ID}`]: { body: { id: TAG_ID, name: 'news', type: 'text' } },
    });
    calls.length = 0;
    vi.stubGlobal('location', { ...window.location, reload: vi.fn() });

    fireEvent.click(element.querySelector('.approve') as HTMLElement);
    await settle();

    expect(calls[0]).toMatchObject({ method: 'PUT', url: '/api/posts/p1', body: JSON.stringify({ status: 'public' }) });
  });

  test('disapproves a post', async () => {
    const { element, calls } = await mount();
    calls.length = 0;
    vi.stubGlobal('location', { ...window.location, reload: vi.fn() });

    fireEvent.click(element.querySelector('.disapprove') as HTMLElement);

    expect(calls[0]).toMatchObject({ method: 'PUT', url: '/api/posts/p1', body: JSON.stringify({ status: 'moderated' }) });
  });
});
