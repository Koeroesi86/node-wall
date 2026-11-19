// @vitest-environment jsdom
import { act, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { fakeRedux } from '../test-utils/redux.ts';
import { TagInline } from './tag-inline.tsx';

const TAG_ID = '11111111-2222-3333-4444-555555555555';

interface Request {
  method: string;
  url: string;
  body: unknown;
  respond: (status: number) => void;
}

const requests: Request[] = [];

class FakeXhr {
  readyState = 0;
  status = 0;
  onreadystatechange?: () => void;
  private request: Request = {
    method: '',
    url: '',
    body: undefined,
    respond: (status) => {
      Object.assign(this, { status, readyState: 4 });
      this.onreadystatechange?.();
    },
  };

  open(method: string, url: string) {
    Object.assign(this.request, { method, url });
  }

  setRequestHeader() {}

  send(body: unknown) {
    this.request.body = body;
    requests.push(this.request);
  }
}

let redux: ReturnType<typeof fakeRedux>;

const tag = { id: TAG_ID, name: 'news', type: 'text' };
const withUser = (role: string, tags: unknown[] = []) => ({ user: { role, tags, received: true, session: null } });
const flush = () => act(async () => { await Promise.resolve(); });
const mount = () => render(<TagInline tagId={TAG_ID} />).container.firstElementChild as HTMLElement;

beforeEach(() => {
  requests.length = 0;
  redux = fakeRedux();
  redux.setState({ tags: {}, ...withUser('guest') });
  vi.useFakeTimers();
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('tag-inline', () => {
  test('requests its tag and the tags of the user', () => {
    mount();

    expect(redux.dispatched).toEqual([
      { type: 'TAG_REQUEST', payload: { id: TAG_ID } },
      { type: 'USER_REQUEST_TAGS', payload: {} },
    ]);
  });

  test('requests again when the tag id changes', () => {
    const { rerender } = render(<TagInline tagId={TAG_ID} />);
    redux.clearDispatched();

    rerender(<TagInline tagId="t2" />);

    expect(redux.dispatched[0]).toEqual({ type: 'TAG_REQUEST', payload: { id: 't2' } });
  });

  test('renders a text tag with a hash and a link to its page', () => {
    const element = mount();

    act(() => redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('guest') }));

    expect(element.querySelector('.label')?.textContent).toBe('#news');
    expect(element.querySelector('.tooltip a')?.getAttribute('href')).toBe(`/tag/${TAG_ID}`);
  });

  test('renders other tag types without a hash', () => {
    const element = mount();

    act(() => redux.setState({ tags: { [TAG_ID]: { ...tag, type: 'location' } }, ...withUser('guest') }));

    expect(element.querySelector('.label')?.textContent).toBe('news');
  });

  test('tells guests to log in instead of offering actions', () => {
    const element = mount();

    act(() => redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('guest') }));

    expect(element.querySelector('.actions')?.textContent).toBe('tag-inline.tooltip.not-logged-in');
    expect(element.querySelector('.likeTag')).toBeNull();
  });

  test('highlights the current preference of logged in users', () => {
    const element = mount();

    act(() => redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('user', [{ tag_id: TAG_ID, type: 'liked' }]) }));

    expect(element.querySelector('.likeTag')?.classList.contains('active')).toBe(true);
    expect(element.querySelector('.dislikeTag')?.classList.contains('active')).toBe(false);
  });

  test('clicking an active preference removes it and reloads the preferences', async () => {
    const element = mount();
    act(() => redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('user', [{ tag_id: TAG_ID, type: 'liked' }]) }));
    redux.clearDispatched();

    fireEvent.click(element.querySelector('.likeTag') as HTMLElement);
    await flush();

    expect(requests[0]).toMatchObject({ method: 'DELETE', url: '/api/user/tags', body: JSON.stringify({ id: TAG_ID }) });
    requests[0].respond(200);
    await flush();
    expect(redux.dispatched).toEqual([{ type: 'USER_REQUEST_TAGS', payload: {} }]);
  });

  test('clicking the other preference switches to it', async () => {
    const element = mount();
    act(() => redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('user', [{ tag_id: TAG_ID, type: 'liked' }]) }));

    fireEvent.click(element.querySelector('.dislikeTag') as HTMLElement);
    await flush();

    expect(requests[0]).toMatchObject({ method: 'PUT', url: '/api/user/tags', body: JSON.stringify({ id: TAG_ID, type: 'disliked' }) });
  });

  test('clicking like on a tag without a preference saves it', async () => {
    const element = mount();
    act(() => redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('user', []) }));

    fireEvent.click(element.querySelector('.likeTag') as HTMLElement);
    await flush();

    expect(requests[0]).toMatchObject({ method: 'PUT', url: '/api/user/tags', body: JSON.stringify({ id: TAG_ID, type: 'liked' }) });
  });

  test('shows and hides the tooltip on hover', () => {
    const element = mount();
    act(() => redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('guest') }));
    const tooltip = element.querySelector('.tooltip') as HTMLElement;

    fireEvent.mouseOver(element);
    expect(tooltip.classList.contains('visible')).toBe(true);

    fireEvent.mouseLeave(element);
    act(() => vi.advanceTimersByTime(200));
    expect(tooltip.classList.contains('visible')).toBe(false);
  });
});
