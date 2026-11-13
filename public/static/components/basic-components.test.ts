import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadComponents, type ComponentsBrowser } from '../../../lib/test-utils/components';

let page: ComponentsBrowser;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  page?.close();
  vi.restoreAllMocks();
});

describe('Component base', () => {
  beforeEach(async () => {
    page = await loadComponents(['content-wrapper']);
  });

  test('adds its stylesheet once per element type', () => {
    page.mount('<content-wrapper></content-wrapper>');
    page.mount('<content-wrapper></content-wrapper>');

    const links = page.document.querySelectorAll('link[rel="stylesheet"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/static/components/content-wrapper.css');
  });

  test('notifies later instances asynchronously that the stylesheet is available', () => {
    page.mount('<content-wrapper></content-wrapper>');
    page.mount('<content-wrapper></content-wrapper>');

    expect(page.pendingTimers()).toEqual([expect.objectContaining({ delay: 1 })]);
  });
});

describe('wrappers', () => {
  test('are registered as custom elements', async () => {
    page = await loadComponents(['main-wrapper', 'content-wrapper', 'welcome-page']);
    ['main-wrapper', 'content-wrapper', 'welcome-page'].forEach(name => expect(page.window.customElements.get(name)).toBeDefined());
  });
});

describe('welcome-page', () => {
  test('renders its translated header and note', async () => {
    page = await loadComponents(['welcome-page']);

    const element = page.mount('<welcome-page></welcome-page>');

    expect([...element.querySelectorAll('translate-text')].map(node => node.getAttribute('alias')))
      .toEqual(['welcome-page.header', 'welcome-page.note']);
  });
});

describe('privacy-page', () => {
  test('renders every section and the operator contact as text', async () => {
    page = await loadComponents(['privacy-page']);

    const element = page.mount('<privacy-page controller="Op &lt;b&gt;" contact="me@example.com"></privacy-page>');

    expect(element.querySelectorAll('translate-text')).toHaveLength(11);
    expect(element.querySelector('.controller')?.textContent).toBe('Op <b>');
    expect(element.querySelector('.contact')?.getAttribute('href')).toBe('mailto:me@example.com');
  });
});

describe('translate-text', () => {
  beforeEach(async () => {
    page = await loadComponents(['translate-text']);
  });

  test('requests its translation when connected', () => {
    page.mount('<translate-text alias="a"></translate-text>');
    expect(page.redux.dispatched()).toEqual([{ type: 'TRANSLATIONS_REQUEST', payload: { alias: 'a' } }]);
  });

  test('shows the translation once it is in the state', () => {
    const element = page.mount('<translate-text alias="a"></translate-text>');

    page.redux.setState({ translations: { a: 'Hello <b>there</b>' } });

    expect(element.innerHTML).toBe('Hello <b>there</b>');
  });

  test('ignores other aliases and not yet received translations', () => {
    const element = page.mount('<translate-text alias="a"></translate-text>');

    page.redux.setState({ translations: { b: 'Other' } });

    expect(element.innerHTML).toBe('');
  });

  test('requests again when the alias changes', () => {
    const element = page.mount('<translate-text alias="a"></translate-text>');
    page.redux.clearDispatched();

    element.setAttribute('alias', 'b');

    expect(page.redux.dispatched()).toEqual([{ type: 'TRANSLATIONS_REQUEST', payload: { alias: 'b' } }]);
  });

  test('stops listening when removed', () => {
    const element = page.mount('<translate-text alias="a"></translate-text>');
    expect(page.redux.listenerCount()).toBe(1);

    element.remove();

    expect(page.redux.listenerCount()).toBe(0);
  });
});

describe('x-icon', () => {
  beforeEach(async () => {
    page = await loadComponents(['x-icon']);
  });

  test('renders the icon of its type', () => {
    expect(page.mount('<x-icon type="home"></x-icon>').innerHTML).toBe('<i class="fas fa-home"></i>');
  });

  test('renders nothing for an unknown type', () => {
    expect(page.mount('<x-icon type="nope"></x-icon>').innerHTML).toBe('');
  });

  test('re-renders when the type changes', () => {
    const element = page.mount('<x-icon type="home"></x-icon>');
    element.setAttribute('type', 'user');
    expect(element.innerHTML).toBe('<i class="far fa-user"></i>');
  });
});

describe('compose-post', () => {
  beforeEach(async () => {
    page = await loadComponents(['compose-post']);
  });

  const compose = () => {
    const element = page.mount('<compose-post></compose-post>');
    const editor = element.querySelector('post-editor') as HTMLElement & { value: string };
    const button = element.querySelector('.send') as HTMLElement;
    return { element, editor, button };
  };

  test('renders an editor and a send button', () => {
    const { element, editor, button } = compose();
    expect(editor).not.toBeNull();
    expect(button.querySelector('translate-text')?.getAttribute('alias')).toBe('compose-post.button.to-send');
    expect(element.querySelector('translate-text[alias="compose-post.button.sending"]')).not.toBeNull();
  });

  test('does not send an empty message', () => {
    page.window.createPost = vi.fn();
    const { editor, button } = compose();
    editor.value = '';

    button.click();

    expect(page.window.createPost).not.toHaveBeenCalled();
  });

  test('sends the message, shows progress and clears the editor', async () => {
    let finish: () => void = () => undefined;
    page.window.createPost = vi.fn(() => new Promise<void>(resolve => (finish = resolve)));
    const { element, editor, button } = compose();
    editor.value = 'hello';

    button.click();
    await flush();

    expect(page.window.createPost).toHaveBeenCalledWith('hello');
    expect(element.classList.contains('sending')).toBe(true);

    finish();
    await flush();

    expect(element.classList.contains('sending')).toBe(false);
    expect(editor.value).toBe('');
  });

  test('keeps the message when sending fails', async () => {
    page.window.createPost = vi.fn().mockRejectedValue(new Error('offline'));
    const { editor, button } = compose();
    editor.value = 'hello';

    button.click();
    await flush();

    expect(editor.value).toBe('hello');
    expect(console.error).toHaveBeenCalled();
  });
});

describe('post-comments-item', () => {
  beforeEach(async () => {
    page = await loadComponents(['post-comments-item']);
  });

  test('requests its comment and renders it when it arrives', () => {
    const element = page.mount('<post-comments-item comment-id="c1" id="comment-c1"></post-comments-item>');

    expect(page.redux.dispatched()).toEqual([{ type: 'COMMENTS_REQUEST', payload: { id: 'c1' } }]);
    expect(element.querySelector('.createdAt')?.getAttribute('href')).toBe('#comment-c1');

    page.redux.setState({ comments: { c1: { id: 'c1', body: 'line1\nline2', created_at: Date.UTC(2024, 0, 2) } } });

    expect(element.querySelector('.body')?.innerHTML).toBe('<div class="line">line1</div>\n<div class="line">line2</div>');
    expect(element.querySelector('.createdAt')?.textContent).not.toBe('');
  });

  test('ignores other comments', () => {
    const element = page.mount('<post-comments-item comment-id="c1"></post-comments-item>');

    page.redux.setState({ comments: { c2: { id: 'c2', body: 'x', created_at: 1 } } });

    expect(element.querySelector('.body')?.innerHTML).toBe('');
  });
});

describe('post-wall', () => {
  beforeEach(async () => {
    page = await loadComponents(['post-wall']);
  });

  test('creates an unfiltered list and loads the tag preferences of the user', () => {
    const element = page.mount('<post-wall instance="i1"></post-wall>');

    expect(page.redux.dispatched()).toEqual([
      { type: 'POSTS_LIST_CREATE_FILTER', payload: { instance: 'i1', likedTags: [], dislikedTags: [] } },
      { type: 'USER_REQUEST_TAGS', payload: {} },
    ]);
    expect(element.querySelector('compose-post')).not.toBeNull();
  });

  test('applies the tag preferences once they are known and shows the list', () => {
    const element = page.mount('<post-wall instance="i1"></post-wall>');
    page.redux.setState({ postsList: { i1: {} }, user: { role: 'user', tags: [] } });
    page.redux.clearDispatched();

    page.redux.setState({
      user: { role: 'user', tags: [{ tag_id: 'a', type: 'liked' }, { tag_id: 'b', type: 'disliked' }] },
    });

    expect(page.redux.dispatched()).toEqual([
      { type: 'POSTS_LIST_SET_FILTER_TAGS', payload: { instance: 'i1', likedTags: ['a'], dislikedTags: ['b'] } },
    ]);
    expect(element.querySelectorAll('post-list')).toHaveLength(1);
    expect(element.querySelector('post-list')?.getAttribute('instance')).toBe('i1');
  });

  test('creates the filter when the list does not exist yet, and adds the list only once', () => {
    const element = page.mount('<post-wall instance="i1"></post-wall>');
    page.redux.setState({ user: { role: 'user', tags: [] } });
    page.redux.clearDispatched();

    page.redux.setState({ user: { role: 'user', tags: [{ tag_id: 'a', type: 'liked' }] } });
    page.redux.setState({ user: { role: 'user', tags: [{ tag_id: 'a', type: 'disliked' }] } });

    expect(page.redux.dispatched()[0]).toMatchObject({ type: 'POSTS_LIST_CREATE_FILTER' });
    expect(element.querySelectorAll('post-list')).toHaveLength(1);
  });
});

describe('tag-page', () => {
  beforeEach(async () => {
    page = await loadComponents(['tag-page']);
  });

  test('prepares a list filtered by the tag, requests the tag and loads posts', () => {
    page.mount('<tag-page tag-id="t1"></tag-page>');

    expect(page.redux.dispatched()).toEqual([
      { type: 'POSTS_LIST_CREATE_FILTER', payload: { instance: 't1', likedTags: ['t1'], dislikedTags: [] } },
      { type: 'TAG_REQUEST', payload: { id: 't1' } },
      { type: 'POSTS_LIST_LOAD_MORE', payload: { instance: 't1' } },
    ]);
  });

  test('renders the tag name and its list once the tag is known', () => {
    const element = page.mount('<tag-page tag-id="t1"></tag-page>');

    page.redux.setState({ tags: { t1: { id: 't1', name: 'news' } } });

    expect(element.querySelector('h2')?.textContent).toBe('#news');
    expect(element.querySelector('post-list')?.getAttribute('liked-tags')).toBe('t1');
  });

  test('does not re-render for an unchanged name', () => {
    const element = page.mount('<tag-page tag-id="t1"></tag-page>');
    page.redux.setState({ tags: { t1: { id: 't1', name: 'news' } } });
    const list = element.querySelector('post-list');

    page.redux.setState({ tags: { t1: { id: 't1', name: 'news' } } });

    expect(element.querySelector('post-list')).toBe(list);
  });

  test('stops listening when removed', () => {
    page.mount('<tag-page tag-id="t1"></tag-page>').remove();
    expect(page.redux.listenerCount()).toBe(0);
  });
});

describe('post-comments', () => {
  beforeEach(async () => {
    page = await loadComponents(['post-comments']);
  });

  test('sends the written comment', () => {
    const element = page.mount('<post-comments post-id="p1"></post-comments>');
    element.querySelector('.body')!.innerHTML = '<div>hi</div>';

    (element.querySelector('.send') as HTMLElement).click();

    expect(page.redux.dispatched()).toEqual([{ type: 'COMMENTS_CREATE', payload: { id: 'p1', parent: null, body: '<div>hi</div>' } }]);
  });

  test('lists the comments of the post once, without duplicates', () => {
    const element = page.mount('<post-comments post-id="p1"></post-comments>');

    page.redux.setState({ posts: { p1: { comments: ['c1', 'c2'] } } });
    page.redux.setState({ posts: { p1: { comments: ['c1', 'c2', 'c3'] } } });

    const items = [...element.querySelectorAll('post-comments-item')];
    expect(items.map(item => item.getAttribute('comment-id'))).toEqual(['c1', 'c2', 'c3']);
    expect(items[0].getAttribute('id')).toBe('comment-c1');
  });

  test('says when there are no comments', () => {
    const element = page.mount('<post-comments post-id="p1"></post-comments>');

    page.redux.setState({ posts: { p1: { comments: [] } } });

    expect(element.querySelector('.commentsList translate-text')?.getAttribute('alias')).toBe('post-comments.no-comments');
  });

  test('waits for the post to load', () => {
    const element = page.mount('<post-comments post-id="p1"></post-comments>');
    page.redux.setState({ posts: { p1: { content: '' } } });
    expect(element.querySelector('.commentsList')?.innerHTML).toBe('');
  });
});
