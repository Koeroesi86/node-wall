import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadComponents, type ComponentsBrowser } from '../../../lib/test-utils/components';

let page: ComponentsBrowser;

const post = (extra = {}) => ({ id: 'p1', content: 'hello\nworld', tags: [], created_at: 1700000000000, owner: null, ...extra });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  page?.close();
  vi.restoreAllMocks();
});

describe('post-preview', () => {
  beforeEach(async () => {
    page = await loadComponents(['post-preview']);
  });

  const mount = () => page.mount('<post-preview post-id="p1"></post-preview>');

  test('requests its post when connected and when the id changes', () => {
    const element = mount();
    expect(page.redux.dispatched()).toEqual([{ type: 'POSTS_REQUEST', payload: { id: 'p1' } }]);

    page.redux.clearDispatched();
    element.setAttribute('post-id', 'p2');
    expect(page.redux.dispatched()).toEqual([{ type: 'POSTS_REQUEST', payload: { id: 'p2' } }]);
  });

  test('renders content, date link and tags of the post', () => {
    const element = mount();

    page.redux.setState({ posts: { p1: post({ tags: [{ id: 't1' }, { id: 't2' }] }) } });

    expect([...element.querySelectorAll('.content .contentLine')].map(line => line.textContent)).toEqual(['hello', 'world']);
    expect(element.querySelector('.date')?.getAttribute('href')).toBe('/post/p1');
    expect(element.querySelector('.date')?.textContent).not.toBe('');
    expect([...element.querySelectorAll('.tags tag-inline')].map(tag => tag.getAttribute('tag-id'))).toEqual(['t1', 't2']);
    expect(element.classList.contains('noTags')).toBe(false);
  });

  test('marks posts without tags', () => {
    const element = mount();
    page.redux.setState({ posts: { p1: post() } });
    expect(element.classList.contains('noTags')).toBe(true);
  });

  test('shows the owner name, or "unknown user" when it has none', () => {
    const element = mount();

    page.redux.setState({ posts: { p1: post({ owner: { id: 'u1', name: 'Ann' } }) } });
    expect(element.querySelector('.owner')?.textContent).toContain('Ann');

    page.redux.setState({ posts: { p1: post({ owner: { id: 'u1', name: 'null' }, content: 'changed' }) } });
    expect(element.querySelector('.owner translate-text[alias="post-preview.unknown-user"]')).not.toBeNull();

    page.redux.setState({ posts: { p1: post({ owner: null, content: 'again' }) } });
    expect(element.querySelector('.owner')?.innerHTML).toBe('');
  });

  // Known bug: the owner name is inserted as HTML, so a name like this runs script in other users' pages.
  test.fails('does not render the owner name as HTML', () => {
    const element = mount();

    page.redux.setState({ posts: { p1: post({ owner: { id: 'u1', name: '<img src=x onerror=alert(1)>' } }) } });

    expect(element.querySelector('.owner img')).toBeNull();
  });

  test('ignores other posts and unchanged posts', () => {
    const element = mount();
    page.redux.setState({ posts: { p2: post({ id: 'p2' }) } });
    expect(element.querySelector('.content')?.innerHTML).toBe('');
  });

  test('expands long content on request', () => {
    const element = mount();
    (element.querySelector('.contentToggle') as HTMLElement).click();

    expect((element.querySelector('.content') as HTMLElement).style.maxHeight).toBe('0px');
    page.flushTimers();
    expect(element.classList.contains('showAll')).toBe(true);
  });

  test('does not render when disconnected', () => {
    const element = mount();
    element.remove();
    page.redux.setState({ posts: { p1: post() } });
    expect(element.querySelector('.content')?.innerHTML).toBe('');
  });
});

describe('post-page', () => {
  beforeEach(async () => {
    page = await loadComponents(['post-page']);
  });

  const mount = () => page.mount('<post-page post-id="p1"></post-page>');

  test('requests the post and embeds its comments', () => {
    const element = mount();
    expect(page.redux.dispatched()).toEqual([{ type: 'POSTS_REQUEST', payload: { id: 'p1' } }]);
    expect(element.querySelector('post-comments')?.getAttribute('post-id')).toBe('p1');
  });

  test('renders the post once it arrives', () => {
    const element = mount();

    page.redux.setState({ posts: { p1: post({ tags: [{ id: 't1' }], owner: { id: 'u1', name: 'Ann' } }) } });

    expect([...element.querySelectorAll('.postContent .contentLine')].map(line => line.textContent)).toEqual(['hello', 'world']);
    expect(element.querySelector('.sentDate x-icon')?.getAttribute('type')).toBe('sentDate');
    expect(element.querySelector('.tags tag-inline')?.getAttribute('tag-id')).toBe('t1');
    expect(element.querySelector('.owner')?.textContent).toContain('Ann');
  });

  test('renders posts without an owner and with an unknown owner name', () => {
    const element = mount();

    page.redux.setState({ posts: { p1: post() } });
    expect(element.querySelector('.owner')?.innerHTML).toBe('');

    page.redux.setState({ posts: { p1: post({ content: 'x', owner: { id: 'u1', name: '' } }) } });
    expect(element.querySelector('.owner translate-text[alias="post-preview.unknown-user"]')).not.toBeNull();
  });

  test('stops listening when removed', () => {
    mount().remove();
    expect(page.redux.listenerCount()).toBe(0);
  });
});

describe('post-list', () => {
  beforeEach(async () => {
    page = await loadComponents(['post-list']);
  });

  const mount = () => {
    page.redux.preloadState(list([]));
    const element = page.mount('<post-list instance="i1"></post-list>');
    (element.querySelector('audio') as HTMLAudioElement).play = vi.fn();
    return element;
  };
  const ids = (element: HTMLElement) => [...element.querySelectorAll('post-preview')].map(node => node.getAttribute('post-id'));
  const list = (posts: string[], extra = {}) => ({ postsList: { i1: { posts, isLoading: false, ...extra } } });

  test('renders a loading indicator and an end marker', () => {
    const element = mount();
    expect(element.querySelector('.end translate-text')?.getAttribute('alias')).toBe('post-list.loading');
  });

  test('loads more posts when its stylesheet arrived, and when scrolled', () => {
    mount(); // the first instance of an element type adds the stylesheet itself
    const element = mount();
    page.redux.clearDispatched();

    page.flushTimers(); // later instances are told the stylesheet is there, which schedules loading after 500ms
    page.flushTimers();
    expect(page.redux.dispatched()).toEqual([{ type: 'POSTS_LIST_LOAD_MORE', payload: { instance: 'i1' } }]);

    page.redux.clearDispatched();
    element.dispatchEvent(new page.window.Event('scroll'));
    expect(page.redux.dispatched()).toEqual([{ type: 'POSTS_LIST_LOAD_MORE', payload: { instance: 'i1' } }]);
  });

  test('renders the posts of its instance in order, before the end marker', () => {
    const element = mount();

    page.redux.setState(list(['a', 'b', 'c']));

    expect(ids(element)).toEqual(['a', 'b', 'c']);
    expect(element.lastElementChild?.classList.contains('end')).toBe(true);
  });

  test('adds new posts and removes the ones that are gone, without duplicates', () => {
    const element = mount();
    page.redux.setState(list(['a', 'b']));

    page.redux.setState(list(['z', 'a']));

    expect(ids(element).sort()).toEqual(['a', 'z']);
    expect(element.querySelectorAll('post-preview[post-id="a"]')).toHaveLength(1);
  });

  test('ignores other instances', () => {
    const element = mount();
    page.redux.setState({ postsList: { other: { posts: ['a'] } } });
    expect(ids(element)).toEqual([]);
  });

  test('shows when it is loading', () => {
    const element = mount();
    const end = element.querySelector('.end') as HTMLElement;

    page.redux.setState(list([], { isLoading: true }));
    expect(end.classList.contains('loading')).toBe(true);

    page.redux.setState(list([], { isLoading: false }));
    expect(end.classList.contains('loading')).toBe(false);
  });

  test('asks for newer posts and plays a sound when the newest bound grows', () => {
    const element = mount();
    const play = (element.querySelector('audio') as HTMLAudioElement).play;
    page.redux.setState({ bounds: { newest: 10, oldest: null } });
    page.redux.clearDispatched();

    page.redux.setState({ bounds: { newest: 20, oldest: null } });
    page.flushTimers();

    expect(play).toHaveBeenCalledOnce();
    expect(page.redux.dispatched()).toEqual([{ type: 'POSTS_LIST_LOAD_NEW', payload: { instance: 'i1' } }]);
  });

  test('loads more when the oldest bound changes', () => {
    mount();
    page.redux.clearDispatched();

    page.redux.setState({ bounds: { newest: 10, oldest: 1 } });

    expect(page.redux.dispatched()).toContainEqual({ type: 'POSTS_LIST_LOAD_MORE', payload: { instance: 'i1' } });
  });

  test('stops listening when removed', () => {
    mount().remove();
    expect(page.redux.listenerCount()).toBe(0);
  });
});

describe('link-preview', () => {
  beforeEach(async () => {
    page = await loadComponents(['link-preview']);
  });

  const mount = () => page.mount('<a is="link-preview" href="https://example.com/a" post-id="p1"></a>');
  const link = { url: 'https://example.com/a', title: 'Title', description: 'A description', image: 'https://example.com/i.png' };

  test('shows the url while the preview loads and requests it', () => {
    const element = mount();

    expect(element.getAttribute('target')).toBe('_blank');
    expect(element.querySelector('.preview')?.textContent?.trim()).toBe('https://example.com/a');
    expect(page.redux.dispatched()).toEqual([{ type: 'LINKS_REQUEST', payload: { href: 'https://example.com/a', postId: 'p1' } }]);
  });

  test('renders the preview once it is available', () => {
    const element = mount();

    page.redux.setState({ links: { 'https://example.com/a': link } });

    expect(element.getAttribute('title')).toBe('Title');
    expect(element.querySelector('.title')?.textContent).toBe('Title');
    expect(element.querySelector('.description')?.textContent?.trim()).toBe('A description');
    expect(element.querySelector('.url')?.textContent).toBe('https://example.com/a');
    expect(element.querySelector('img.image')?.getAttribute('src')).toBe('https://example.com/i.png');
    expect(element.querySelector('.preview')?.classList.contains('hasImage')).toBe(true);
  });

  test('shortens long descriptions', () => {
    const element = mount();

    page.redux.setState({ links: { 'https://example.com/a': { ...link, description: 'x'.repeat(200) } } });

    expect(element.querySelector('.description')?.textContent).toMatch(/x{150}\s*…/);
    expect(element.querySelector('.description')?.textContent).not.toContain('x'.repeat(151));
  });

  test('renders previews without an image', () => {
    const element = mount();

    page.redux.setState({ links: { 'https://example.com/a': { ...link, image: '' } } });

    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('.preview')?.classList.contains('hasImage')).toBe(false);
  });
});
