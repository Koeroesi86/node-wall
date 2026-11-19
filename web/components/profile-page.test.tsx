// @vitest-environment jsdom
import { act, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fakeFetch } from '../test-utils/fetch.ts';
import { fakeRedux } from '../test-utils/redux.ts';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { ProfilePage } from './profile-page.tsx';

let redux: ReturnType<typeof fakeRedux>;

const sessions = [
  { userId: 'u1', sessionId: 's1', sessionStatus: 'active', sessionCreatedAt: 1, loginType: 'email', lastActive: 2, details: { userAgent: 'UA', remoteAddress: null } },
  { userId: 'u1', sessionId: 's2', sessionStatus: 'pending', sessionCreatedAt: 1, loginType: 'other', lastActive: null, details: null },
];
const userInfo = {
  user: { id: 'u1', name: 'Ann', role: 'user', created_at: 1 },
  session: { id: 's1', users_login_id: 'l1', status: 'active', created_at: 1, last_active: null },
  login: { id: 'l1', type: 'email', user_id: 'u1', value: 'a@b.c' },
};
const routes = {
  'GET /api/user': { body: userInfo },
  'GET /api/user/sessions': { body: sessions },
};
const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

const mount = async (extraRoutes = {}) => {
  const calls = fakeFetch({ ...routes, ...extraRoutes });
  const { container } = render(<ProfilePage sessionId="s1" />);
  await flush();
  calls.length = 0;

  return { element: container.firstElementChild as HTMLElement, calls };
};

beforeEach(() => {
  redux = fakeRedux();
  redux.setState({ tags: {}, user: { role: 'user', tags: null } });
  vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('profile-page', () => {
  test('shows the current name and requests the tag preferences', async () => {
    const { element } = await mount();

    expect((element.querySelector('.name') as HTMLInputElement).value).toBe('Ann');
    expect(redux.dispatched).toContainEqual({ type: 'USER_REQUEST_TAGS', payload: {} });
  });

  test('sets the rename input texts from translations', async () => {
    const { element } = await mount();

    expect(element.querySelector('.name')?.getAttribute('placeholder')).toBe('profile-page.rename.input.placeholder');
    expect(element.querySelector('.name')?.getAttribute('title')).toBe('profile-page.rename.input.title');
  });

  test('lists the sessions and marks the current one', async () => {
    const { element } = await mount();
    const items = [...element.querySelectorAll('.session')];

    expect(items).toHaveLength(2);
    expect(items[0].classList.contains('current')).toBe(true);
    expect(items[0].getAttribute('title')).toBe('UA');
    expect(items[0].querySelector('.type .x-icon')).not.toBeNull();
    expect(items[0].querySelector('.meta .translate-text')?.textContent).toBe('profile-page.session-list.session.status.active');
    expect(items[1].classList.contains('current')).toBe(false);
    expect(items[1].querySelector('.type')?.textContent?.trim()).toBe('other');
  });

  test('warns instead of ending the current session', async () => {
    const { element, calls } = await mount();

    fireEvent.click(element.querySelector('.session.current .exit') as HTMLElement);

    expect(window.alert).toHaveBeenCalledWith('profile-page.session-list.session.current.exit-alert');
    expect(calls).toHaveLength(0);
  });

  test('ends another session', async () => {
    const { element, calls } = await mount();

    fireEvent.click(element.querySelectorAll('.session')[1].querySelector('.exit') as HTMLElement);
    await flush();

    expect(calls[0]).toMatchObject({ method: 'DELETE', url: '/api/user/sessions/s2' });
    expect(element.querySelectorAll('.session')).toHaveLength(1);
  });

  test('renames the user', async () => {
    const { element, calls } = await mount();
    fireEvent.change(element.querySelector('.name') as HTMLInputElement, { target: { value: 'Bob' } });

    fireEvent.click(element.querySelector('.renameUserWrapper .button') as HTMLElement);

    expect(calls[0]).toMatchObject({ method: 'PUT', url: '/api/user/name', body: JSON.stringify({ name: 'Bob' }) });
  });

  test('does not rename to an empty name', async () => {
    const { element, calls } = await mount();
    fireEvent.change(element.querySelector('.name') as HTMLInputElement, { target: { value: '' } });

    fireEvent.click(element.querySelector('.renameUserWrapper .button') as HTMLElement);

    expect(calls).toHaveLength(0);
  });

  test('offers the data export as a download', async () => {
    const { element } = await mount();

    expect(element.querySelector('.exportData')?.getAttribute('href')).toBe('/api/user/export');
  });

  test('requests a code, then deletes the account with it', async () => {
    const { element, calls } = await mount();
    vi.spyOn(window, 'prompt').mockReturnValue('abc123');

    fireEvent.click(element.querySelector('.deleteAccount') as HTMLElement);
    await flush();

    expect(window.prompt).toHaveBeenCalledWith('profile-page.delete.code-sent');
    expect(calls.map(({ method, url }) => `${method} ${url}`)).toEqual(['POST /api/user/deletion', 'DELETE /api/user']);
    expect(calls[1].body).toBe(JSON.stringify({ code: 'abc123' }));
  });

  test('does not delete without a code', async () => {
    const { element, calls } = await mount();
    vi.spyOn(window, 'prompt').mockReturnValue(null);

    fireEvent.click(element.querySelector('.deleteAccount') as HTMLElement);
    await flush();

    expect(calls.map(({ method }) => method)).toEqual(['POST']);
  });

  test('says when the deletion failed', async () => {
    const { element } = await mount({ 'DELETE /api/user': { status: 400 } });
    vi.spyOn(window, 'prompt').mockReturnValue('ABC123');

    fireEvent.click(element.querySelector('.deleteAccount') as HTMLElement);
    await flush();

    expect(window.alert).toHaveBeenCalledWith('profile-page.delete.failed');
  });

  test('lists liked and disliked tags once known', async () => {
    const { element } = await mount();

    act(() => redux.setState({ tags: {}, user: { role: 'user', tags: [{ tag_id: 'a', type: 'liked' }, { tag_id: 'b', type: 'disliked' }] } }));

    expect(element.querySelectorAll('.likedTags .list .tag-inline')).toHaveLength(1);
    expect(element.querySelectorAll('.dislikedTags .list .tag-inline')).toHaveLength(1);
    expect(redux.dispatched.filter(action => action.type === 'TAG_REQUEST').map(action => action.payload)).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  test('says when there are no preferences', async () => {
    const { element } = await mount();

    act(() => redux.setState({ tags: {}, user: { role: 'user', tags: [{ tag_id: 'x', type: 'other' }] } }));

    expect(element.querySelector('.likedTags .list')?.textContent).toBe('No liked tags');
    expect(element.querySelector('.dislikedTags .list')?.textContent).toBe('No disliked tags');
  });
});
