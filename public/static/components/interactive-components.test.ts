import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadComponents, type ComponentsBrowser } from '../../../lib/test-utils/components';

let page: ComponentsBrowser;

const TAG_ID = '11111111-2222-3333-4444-555555555555';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

/** Answers the oldest request that has not been answered yet, then lets the code that waited on it run. */
const reply = async (status: number, body?: unknown, headers?: Record<string, string>) => {
  await flush();
  const request = page.requests.shift();
  if (!request) throw new Error('no pending request');
  request.respond(status, body, headers);
  await flush();
  return request;
};

/** `TranslateText.getTranslation` waits for a real redux store, so answer it directly. */
const stubTranslations = () => page.evaluate('TranslateText.getTranslation = alias => Promise.resolve({ value: "t:" + alias })');

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  page?.close();
  vi.restoreAllMocks();
});

describe('navigation-wrapper', () => {
  beforeEach(async () => {
    page = await loadComponents(['x-icon', 'navigation-wrapper']);
    page.window.localStorage.clear();
  });

  const mount = () => page.mount('<navigation-wrapper session-id="s1"></navigation-wrapper>');
  const user = (extra = {}) => ({ user: { received: true, role: 'user', name: 'Ann', tags: [], session: { id: 's1', status: 'active' }, ...extra } });

  test('requests its translations and the user', () => {
    mount();
    const actions = page.redux.dispatched();

    expect(actions.filter(action => action.type === 'TRANSLATIONS_REQUEST')).toHaveLength(9);
    expect(actions).toContainEqual({ type: 'USER_REQUEST', payload: {} });
  });

  test('starts hidden until its stylesheet is available', () => {
    const element = mount();
    expect(element.style.display).toBe('none');
    (element as HTMLElement & { onStyleSheetLoaded: () => void }).onStyleSheetLoaded();
    expect(element.style.display).toBe('');
  });

  test('marks the link of the current page', () => {
    expect(mount().querySelector('a.home')?.classList.contains('current')).toBe(true);
  });

  test('shows a login link to guests', () => {
    const element = mount();
    page.redux.setState({ user: { received: true, role: 'guest', name: '', session: false, tags: [] } });
    expect(element.querySelector('.user a.login')?.getAttribute('href')).toBe('/login');
  });

  test('shows the user and logout to logged in users', () => {
    const element = mount();
    page.redux.setState(user());
    expect(element.querySelector('.userNameWrapper')?.textContent).toContain('Ann');
    expect(element.querySelector('form.logoutForm')?.getAttribute('method')).toBe('post');
    expect(element.querySelector('form.logoutForm')?.getAttribute('action')).toBe('/logout');
    expect(element.querySelector('button.logout')).not.toBeNull();
    expect(element.querySelector('.moderation')).toBeNull();
  });

  test('shows moderation to admins', () => {
    const element = mount();
    page.redux.setState(user({ role: 'admin' }));
    expect(element.querySelector('.moderation')?.getAttribute('href')).toBe('/moderation');
  });

  test('renders the user only once', () => {
    const element = mount();
    page.redux.setState(user());
    page.redux.setState(user({ name: 'Bob' }));
    expect(element.querySelector('.userNameWrapper')?.textContent).toContain('Ann');
  });

  test('titles its links with translations', () => {
    const element = mount();
    page.redux.setState({ translations: { 'navigation-wrapper.home': 'Home', 'navigation-wrapper.wall': 'Wall' } });
    expect(element.querySelector('.home')?.getAttribute('title')).toBe('Home');
    expect(element.querySelector('.wall')?.getAttribute('title')).toBe('Wall');
  });

  test('toggles and remembers the dark theme', () => {
    const element = mount();
    const toggle = element.querySelector('.darkThemeToggle') as HTMLElement;
    expect(page.document.body.classList.contains('darkTheme')).toBe(false);

    toggle.click();
    expect(page.document.body.classList.contains('darkTheme')).toBe(true);
    expect(page.window.localStorage.getItem('darkTheme')).toBe('on');
    expect(toggle.querySelector('x-icon')?.getAttribute('type')).toBe('lightTheme');

    toggle.click();
    expect(page.document.body.classList.contains('darkTheme')).toBe(false);
  });

  test('starts in dark theme when remembered', () => {
    page.window.localStorage.setItem('darkTheme', 'on');
    mount();
    expect(page.document.body.classList.contains('darkTheme')).toBe(true);
  });

  test('toggles and remembers the collapsed menu', () => {
    const element = mount();
    (element.querySelector('.menuToggle') as HTMLElement).click();
    expect(element.classList.contains('collapsed')).toBe(true);
    expect(page.window.localStorage.getItem('collapsedMenu')).toBe('on');

    (element.querySelector('.menuToggle') as HTMLElement).click();
    expect(element.classList.contains('collapsed')).toBe(false);
  });
});
