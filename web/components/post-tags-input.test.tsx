// @vitest-environment jsdom
import { act, cleanup, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fakeApiSchemas } from '../test-utils/api-schemas.ts';
import { fakeFetch } from '../test-utils/fetch.ts';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { PostTagsInput, type PostTagsInputHandle } from './post-tags-input.tsx';

const TAG_ID = '11111111-2222-3333-4444-555555555555';
const news = { id: TAG_ID, name: 'news', type: 'text' };

const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const mount = () => {
  const ref = createRef<PostTagsInputHandle>();
  const { container } = render(<PostTagsInput postId="p1" ref={ref} />);

  return { element: container.firstElementChild as HTMLElement, handle: () => ref.current as PostTagsInputHandle };
};
const type = (element: HTMLElement, text: string) => fireEvent.change(element.querySelector('.input') as HTMLInputElement, { target: { value: text } });
const pause = () => act(async () => { await vi.advanceTimersByTimeAsync(200); });

beforeEach(() => {
  vi.useFakeTimers();
  fakeApiSchemas();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('post-tags-input', () => {
  test('is focusable and shows when it has focus', () => {
    const { element } = mount();
    expect(element.getAttribute('tabindex')).toBe('0');

    fireEvent.focus(element);
    expect(element.classList.contains('focused')).toBe(true);
    fireEvent.blur(element);
    expect(element.classList.contains('focused')).toBe(false);
  });

  test('searches tags after a pause in typing and offers to create a missing one', async () => {
    const calls = fakeFetch({ 'GET /api/tags?s=new': { body: [news] } });
    const { element } = mount();

    type(element, 'ne');
    type(element, 'new');
    await pause();

    expect(calls).toEqual([expect.objectContaining({ method: 'GET', url: '/api/tags?s=new' })]);
    const results = [...element.querySelectorAll('.results .tagResult')];
    expect(results[0].textContent).toBe('news');
    expect(results[1].textContent).toBe('"new" post-tags-input.create-tag');
  });

  test('shows a tag name with markup as plain text', async () => {
    fakeFetch({ 'GET /api/tags?s=x': { body: [{ ...news, name: '<img src=x onerror=alert(1)>' }] } });
    const { element } = mount();

    type(element, 'x');
    await pause();

    const result = element.querySelector('.results .tagResult');
    expect(result?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(result?.querySelector('img')).toBeNull();
  });

  test('shows a search term with markup as plain text in the create option', async () => {
    fakeFetch({ 'GET /api/tags?s=<b id="injected">x</b>': { body: [] } });
    const { element } = mount();

    type(element, '<b id="injected">x</b>');
    await pause();

    const create = element.querySelector('.results .tagResult');
    expect(create?.querySelector('#injected')).toBeNull();
    expect(create?.textContent).toContain('"<b id="injected">x</b>"');
  });

  test('does not offer to create a tag that exists', async () => {
    fakeFetch({ 'GET /api/tags?s=news': { body: [news] } });
    const { element } = mount();

    type(element, 'news');
    await pause();

    expect(element.querySelectorAll('.results .tagResult')).toHaveLength(1);
  });

  test('clears the results when the input is emptied', async () => {
    fakeFetch({ 'GET /api/tags?s=news': { body: [] } });
    const { element } = mount();
    type(element, 'news');
    await pause();

    type(element, '');

    expect(element.querySelector('.results')?.innerHTML).toBe('');
  });

  test('assigns a tag to the post and lists it', async () => {
    const calls = fakeFetch({ [`GET /api/tags/${TAG_ID}`]: { body: news } });
    const { element, handle } = mount();

    await act(async () => { await handle().add(TAG_ID); });

    expect(calls.map(({ method, url }) => `${method} ${url}`)).toEqual(['POST /api/posts/p1/tags', `GET /api/tags/${TAG_ID}`]);
    expect(calls[0].body).toBe(JSON.stringify({ id: TAG_ID }));
    expect(handle().tagIds).toEqual([TAG_ID]);
    expect(element.querySelector('.tagElement .label')?.textContent).toBe('news');
    expect(element.querySelector('.tagElement .remove')?.getAttribute('title')).toBe('post-tags-input.remove-tag.title');
  });

  test('lists a tag without assigning it when asked', async () => {
    const calls = fakeFetch({ [`GET /api/tags/${TAG_ID}`]: { body: news } });
    const { handle } = mount();

    await act(async () => { await handle().add(TAG_ID, false); });

    expect(calls.some(call => call.method === 'POST')).toBe(false);
    expect(handle().tagIds).toEqual([TAG_ID]);
  });

  test('does not list a tag twice', async () => {
    fakeFetch({ [`GET /api/tags/${TAG_ID}`]: { body: news } });
    const { handle } = mount();
    await act(async () => { await handle().add(TAG_ID, false); });

    await act(async () => { await handle().add(TAG_ID, false); });

    expect(handle().tagIds).toEqual([TAG_ID]);
  });

  test('removes a tag from the post and from the list', async () => {
    const calls = fakeFetch({ [`GET /api/tags/${TAG_ID}`]: { body: news } });
    const { element, handle } = mount();
    await act(async () => { await handle().add(TAG_ID, false); });
    calls.length = 0;

    fireEvent.click(element.querySelector('.tagElement .remove') as HTMLElement);
    await settle();

    expect(calls[0]).toMatchObject({ method: 'DELETE', url: `/api/posts/p1/tags/${TAG_ID}` });
    expect(handle().tagIds).toEqual([]);
  });

  test('creates a tag and lists it', async () => {
    const calls = fakeFetch({
      'POST /api/tags': { body: { id: 't9', name: 'fresh', type: 'text' } },
      'GET /api/tags/t9': { body: { id: 't9', name: 'fresh', type: 'text' } },
    });
    const { handle } = mount();

    await act(async () => { await handle().createTag('fresh'); });

    expect(calls[0]).toMatchObject({ method: 'POST', url: '/api/tags', body: JSON.stringify({ name: 'fresh', type: 'text' }) });
    expect(handle().tagIds).toEqual(['t9']);
  });
});
