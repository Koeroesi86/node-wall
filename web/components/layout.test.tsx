// @vitest-environment jsdom
import { act, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { fakeRedux } from '../test-utils/redux.ts';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { Layout } from './layout.tsx';

let redux: ReturnType<typeof fakeRedux>;

const user = (extra = {}) => ({ user: { received: true, role: 'user', name: 'Ann', tags: [], session: { id: 's1', status: 'active' }, ...extra } });
const mount = (translations?: Record<string, string>) => {
  const { container } = render(<Layout><p className="page">content</p></Layout>, translations);

  return container.querySelector('.navigation-wrapper') as HTMLElement;
};

beforeEach(() => {
  localStorage.clear();
  document.body.classList.remove('darkTheme');
  redux = fakeRedux();
  redux.setState({ user: { received: false, role: 'guest', tags: null, session: null } });
});

afterEach(cleanup);

describe('layout', () => {
  test('frames the page and links the privacy notice', () => {
    const { container } = render(<Layout><p className="page">content</p></Layout>);

    expect(container.querySelector('.content-wrapper .page')?.textContent).toBe('content');
    expect(container.querySelector('.content-wrapper .site-footer a')?.getAttribute('href')).toBe('/privacy');
  });

  test('requests the user', () => {
    mount();

    expect(redux.dispatched).toContainEqual({ type: 'USER_REQUEST', payload: {} });
  });

  test('marks the link of the current page', () => {
    expect(mount().querySelector('a.home')?.classList.contains('current')).toBe(true);
    expect(mount().querySelector('a.wall')?.classList.contains('current')).toBe(false);
  });

  test('shows nothing about the user before it is known', () => {
    expect(mount().querySelector('.user')?.innerHTML).toBe('');
  });

  test('shows a login link to guests', () => {
    const element = mount();

    act(() => redux.setState({ user: { received: true, role: 'guest', name: '', session: false, tags: [] } }));

    expect(element.querySelector('.user a.login')?.getAttribute('href')).toBe('/login');
  });

  test('shows the user and logout to logged in users', () => {
    const element = mount();

    act(() => redux.setState(user()));

    expect(element.querySelector('.userNameWrapper')?.textContent).toContain('Ann');
    expect(element.querySelector('form.logoutForm')?.getAttribute('method')).toBe('post');
    expect(element.querySelector('form.logoutForm')?.getAttribute('action')).toBe('/logout');
    expect(element.querySelector('button.logout')).not.toBeNull();
    expect(element.querySelector('.moderation')).toBeNull();
  });

  test('shows moderation to admins', () => {
    const element = mount();

    act(() => redux.setState(user({ role: 'admin' })));

    expect(element.querySelector('.moderation')?.getAttribute('href')).toBe('/moderation');
  });

  test('titles its links with translations', () => {
    const element = mount({ 'navigation-wrapper.home': 'Home', 'navigation-wrapper.wall': 'Wall' });

    expect(element.querySelector('.home')?.getAttribute('title')).toBe('Home');
    expect(element.querySelector('.wall')?.getAttribute('title')).toBe('Wall');
  });

  test('names the user in the title of the profile link', () => {
    const element = mount({ 'navigation-wrapper.user.logged-in-as': 'Signed in as %USERNAME%' });

    act(() => redux.setState(user()));

    expect(element.querySelector('.userNameWrapper')?.getAttribute('title')).toBe('Signed in as Ann');
  });

  test('toggles and remembers the dark theme', () => {
    const element = mount();
    const toggle = element.querySelector('.darkThemeToggle') as HTMLElement;
    expect(document.body.classList.contains('darkTheme')).toBe(false);

    fireEvent.click(toggle);
    expect(document.body.classList.contains('darkTheme')).toBe(true);
    expect(localStorage.getItem('darkTheme')).toBe('on');
    expect(toggle.querySelector('.fa-sun-o')).not.toBeNull();

    fireEvent.click(toggle);
    expect(document.body.classList.contains('darkTheme')).toBe(false);
  });

  test('starts in dark theme when remembered', () => {
    localStorage.setItem('darkTheme', 'on');

    mount();

    expect(document.body.classList.contains('darkTheme')).toBe(true);
  });

  test('toggles and remembers the collapsed menu', () => {
    const element = mount();

    fireEvent.click(element.querySelector('.menuToggle') as HTMLElement);
    expect(element.classList.contains('collapsed')).toBe(true);
    expect(localStorage.getItem('collapsedMenu')).toBe('on');

    fireEvent.click(element.querySelector('.menuToggle') as HTMLElement);
    expect(element.classList.contains('collapsed')).toBe(false);
  });
});
