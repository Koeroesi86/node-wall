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

describe('post-editor', () => {
  type Editor = HTMLElement & { value: string };
  let tributeOptions: { collection: { values: (text: string, cb: (tags: unknown[]) => void) => void; selectTemplate: (item: unknown) => string }[] };

  beforeEach(async () => {
    page = await loadComponents(['post-editor']);
    page.window.Tribute = class {
      attach = vi.fn();
      constructor(options: typeof tributeOptions) {
        tributeOptions = options;
      }
    };
  });

  const mount = () => page.mount('<post-editor></post-editor>') as Editor;
  const input = (element: Editor) => element.querySelector('.postEditorInput') as HTMLElement;

  test('renders a placeholder and an editable area', () => {
    const element = mount();
    expect(element.querySelector('.postEditorPlaceHolder translate-text')?.getAttribute('alias')).toBe('compose-post.input.placeholder');
    expect(input(element).getAttribute('contenteditable')).toBe('true');
  });

  test('hides the placeholder while there is content', () => {
    const element = mount();

    input(element).innerHTML = 'text';
    input(element).dispatchEvent(new page.window.Event('input'));
    expect(element.classList.contains('hasContent')).toBe(true);
    expect(element.querySelector('.postEditorPlaceHolder')?.classList.contains('hidden')).toBe(true);

    input(element).innerHTML = '';
    input(element).dispatchEvent(new page.window.Event('input'));
    expect(element.classList.contains('hasContent')).toBe(false);
    expect(element.querySelector('.postEditorPlaceHolder')?.classList.contains('hidden')).toBe(false);
  });

  test('value turns lines into newlines and tags into references', () => {
    const element = mount();
    input(element).innerHTML = '<div>first</div><div><br></div><div>see <span tag-id="t1" contenteditable="false">#news</span></div>';
    expect(element.value).toBe('\nfirst\n\n\nsee #!t1');
  });

  test('setting value replaces the content once', () => {
    const element = mount();
    element.value = 'hello';
    expect(input(element).innerHTML).toBe('hello');
    expect(element.classList.contains('hasContent')).toBe(true);

    element.value = '';
    expect(element.classList.contains('hasContent')).toBe(false);
  });

  test('pastes as plain text', () => {
    const element = mount();
    const execCommand = vi.fn();
    Object.assign(page.document, { execCommand });
    const event = new page.window.Event('paste', { bubbles: true, cancelable: true });
    Object.assign(event, { clipboardData: { getData: () => '<b>raw</b>' } });

    input(element).dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('insertText', false, '<b>raw</b>');
  });

  test('looks up tags for #-completion', () => {
    mount();
    const { values, selectTemplate } = tributeOptions.collection[0];
    const callback = vi.fn();

    values('', callback);
    expect(page.requests).toHaveLength(0);

    values('ne', callback);
    expect(page.requests[0]).toMatchObject({ method: 'GET', url: '/api/tags?s=ne' });
    page.requests[0].respond(200, [{ id: 't1', name: 'news', type: 'text' }]);
    expect(callback).toHaveBeenCalledWith([{ id: 't1', name: 'news', type: 'text' }]);

    expect(selectTemplate({ original: { id: 't1', name: 'news' } })).toBe('<span tag-id="t1" contenteditable="false">#news</span>');
  });
});

describe('login-page', () => {
  beforeEach(async () => {
    page = await loadComponents(['navigation-wrapper', 'login-page']);
  });

  const mount = () => page.mount('<login-page></login-page>');

  test('requests the placeholder translations', () => {
    mount();
    expect(page.redux.dispatched().map(action => action.payload?.alias)).toEqual([
      'login-page.activate-session.input.placeholder',
      'login-page.create-session.input.placeholder',
    ]);
  });

  test('offers to create a session when there is none', () => {
    const element = mount();
    expect(element.querySelector('.createSession')?.classList.contains('hidden')).toBe(false);
    expect(element.querySelector('.activateSession')?.classList.contains('hidden')).toBe(true);
  });

  test('offers to activate the session named in the url', () => {
    page.window.history.pushState({}, '', '/login?session=abc');
    const element = mount();
    expect(element.querySelector('.activateSession')?.classList.contains('hidden')).toBe(false);
    expect(element.querySelector('.createSession')?.classList.contains('hidden')).toBe(true);
  });

  test('sets the input placeholders from translations', () => {
    const element = mount();

    page.redux.setState({
      translations: {
        'login-page.activate-session.input.placeholder': 'Code',
        'login-page.create-session.input.placeholder': 'Email',
      },
    });

    expect(element.querySelector('.activateSession .input')?.getAttribute('placeholder')).toBe('Code');
    expect(element.querySelector('.createSession .input')?.getAttribute('placeholder')).toBe('Email');
  });

  test('posts the email to start a login', () => {
    const element = mount();
    (element.querySelector('.createSession .input') as HTMLInputElement).value = 'a@b.c';

    element.querySelector('.createSession form')!.dispatchEvent(new page.window.Event('submit', { cancelable: true }));

    expect(page.requests[0]).toMatchObject({
      method: 'POST',
      url: '/api/user',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', value: 'a@b.c' }),
    });
  });

  test('does not post an empty email', () => {
    const element = mount();
    element.querySelector('.createSession form')!.dispatchEvent(new page.window.Event('submit', { cancelable: true }));
    expect(page.requests).toHaveLength(0);
  });

  test.each([
    ['a valid code', 'ABC123', true],
    ['a code of the wrong length', 'ABC', false],
    ['lowercase characters', 'abc123', false],
  ])('activating with %s', (_name, code, navigates) => {
    page.window.history.pushState({}, '', '/login?session=abc');
    const element = mount();
    (element.querySelector('.activateSession .input') as HTMLInputElement).value = code;
    const submit = new page.window.Event('submit', { cancelable: true });

    element.querySelector('.activateSession form')!.dispatchEvent(submit);

    expect(submit.defaultPrevented).toBe(true);
    // jsdom cannot navigate, and says so when the page tries to
    const attempted = vi.mocked(console.error).mock.calls.some(([error]) => String(error?.message ?? error).includes('navigation'));
    expect(attempted).toBe(navigates);
  });
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
    expect(element.querySelector('.logout')).not.toBeNull();
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

describe('tag-inline', () => {
  beforeEach(async () => {
    page = await loadComponents(['tag-inline']);
  });

  const mount = () => page.mount(`<tag-inline tag-id="${TAG_ID}"></tag-inline>`);
  const tag = { id: TAG_ID, name: 'news', type: 'text' };
  const withUser = (role: string, tags: unknown[] = []) => ({ user: { role, tags, received: true, session: null } });

  test('requests its tag and the tags of the user', () => {
    mount();
    expect(page.redux.dispatched()).toEqual([
      { type: 'TAG_REQUEST', payload: { id: TAG_ID } },
      { type: 'USER_REQUEST_TAGS', payload: {} },
    ]);
  });

  test('requests again when the tag id changes', () => {
    const element = mount();
    page.redux.clearDispatched();
    element.setAttribute('tag-id', 't2');
    expect(page.redux.dispatched()[0]).toEqual({ type: 'TAG_REQUEST', payload: { id: 't2' } });
  });

  test('renders a text tag with a hash and a link to its page', () => {
    const element = mount();

    page.redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('guest') });

    expect(element.querySelector('.label')?.textContent).toBe('#news');
    expect(element.querySelector('.tooltip a')?.getAttribute('href')).toBe(`/tag/${TAG_ID}`);
  });

  // Known bug: the label is appended to on every render, so it doubles for tags that are not text tags.
  test.fails('renders other tag types without a hash', () => {
    const element = mount();
    page.redux.setState({ tags: { [TAG_ID]: { ...tag, type: 'location' } }, ...withUser('guest') });
    expect(element.querySelector('.label')?.textContent).toBe('news');
  });

  test('tells guests to log in instead of offering actions', () => {
    const element = mount();
    page.redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('guest') });
    expect(element.querySelector('.actions translate-text')?.getAttribute('alias')).toBe('tag-inline.tooltip.not-logged-in');
    expect(element.querySelector('.likeTag')).toBeNull();
  });

  test('highlights the current preference of logged in users', () => {
    const element = mount();
    page.redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('user', [{ tag_id: TAG_ID, type: 'liked' }]) });
    expect(element.querySelector('.likeTag')?.classList.contains('active')).toBe(true);
    expect(element.querySelector('.dislikeTag')?.classList.contains('active')).toBe(false);
  });

  test('clicking an active preference removes it and reloads the preferences', async () => {
    const element = mount();
    page.redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('user', [{ tag_id: TAG_ID, type: 'liked' }]) });
    page.redux.clearDispatched();

    (element.querySelector('.likeTag') as HTMLElement).click();
    await flush();

    expect(page.requests[0]).toMatchObject({ method: 'DELETE', url: '/api/user/tags', body: JSON.stringify({ id: TAG_ID }) });
    await reply(200);
    expect(page.redux.dispatched()).toEqual([{ type: 'USER_REQUEST_TAGS', payload: {} }]);
  });

  test('clicking the other preference switches to it', async () => {
    const element = mount();
    page.redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('user', [{ tag_id: TAG_ID, type: 'liked' }]) });

    (element.querySelector('.dislikeTag') as HTMLElement).click();
    await flush();

    expect(page.requests[0]).toMatchObject({ method: 'PUT', url: '/api/user/tags', body: JSON.stringify({ id: TAG_ID, type: 'disliked' }) });
  });

  // Known bug: for a tag the user has no preference for yet, `currentUserTag` is undefined and the click throws.
  test.fails('clicking like on a tag without a preference saves it', async () => {
    const element = mount();
    page.redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('user', []) });

    (element.querySelector('.likeTag') as HTMLElement).click();
    await flush();

    expect(page.requests[0]).toMatchObject({ method: 'PUT', url: '/api/user/tags', body: JSON.stringify({ id: TAG_ID, type: 'liked' }) });
  });

  test('shows and hides the tooltip on hover', () => {
    const element = mount();
    page.redux.setState({ tags: { [TAG_ID]: tag }, ...withUser('guest') });
    const tooltip = element.querySelector('.tooltip') as HTMLElement;

    element.dispatchEvent(new page.window.MouseEvent('mouseover', { bubbles: true }));
    expect(tooltip.classList.contains('visible')).toBe(true);

    element.dispatchEvent(new page.window.MouseEvent('mouseleave'));
    page.flushTimers();
    expect(tooltip.classList.contains('visible')).toBe(false);
  });

  test('stops listening when removed', () => {
    mount().remove();
    expect(page.redux.listenerCount()).toBe(0);
  });
});

describe('post-tags-input', () => {
  beforeEach(async () => {
    page = await loadComponents(['translate-text', 'post-tags-input']);
    stubTranslations();
  });

  const mount = () => page.mount('<post-tags-input post-id="p1"></post-tags-input>') as HTMLElement & {
    add: (id: string, assign?: boolean) => Promise<void>;
    createTag: (name: string, type?: string) => Promise<unknown>;
    tagIds: string[];
  };
  const type = (element: HTMLElement, text: string) => {
    const field = element.querySelector('.input') as HTMLInputElement;
    field.value = text;
    field.dispatchEvent(new page.window.Event('input'));
  };

  test('is focusable and shows when it has focus', () => {
    const element = mount();
    expect(element.getAttribute('tabindex')).toBe('0');

    element.dispatchEvent(new page.window.FocusEvent('focusin'));
    expect(element.classList.contains('focused')).toBe(true);
    element.dispatchEvent(new page.window.FocusEvent('focusout'));
    expect(element.classList.contains('focused')).toBe(false);
  });

  test('searches tags after a pause in typing and offers to create a missing one', async () => {
    const element = mount();

    type(element, 'ne');
    type(element, 'new');
    expect(page.pendingTimers()).toHaveLength(1);
    page.flushTimers();

    expect(page.requests[0]).toMatchObject({ method: 'GET', url: '/api/tags?s=new' });
    await reply(200, [{ id: TAG_ID, name: 'news', type: 'text' }]);

    const results = [...element.querySelectorAll('.results .tagResult')];
    expect(results[0].textContent).toBe('news');
    expect(results[1].querySelector('translate-text')?.getAttribute('alias')).toBe('post-tags-input.create-tag');
  });

  test('shows a tag name with markup as plain text', async () => {
    const element = mount();
    type(element, 'x');
    page.flushTimers();

    await reply(200, [{ id: TAG_ID, name: '<img src=x onerror=alert(1)>', type: 'text' }]);

    const result = element.querySelector('.results .tagResult');
    expect(result?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(result?.querySelector('img')).toBeNull();
  });

  test('shows a search term with markup as plain text in the create option', async () => {
    const element = mount();
    type(element, '<b id="injected">x</b>');
    page.flushTimers();

    await reply(200, []);

    const create = element.querySelector('.results .tagResult');
    expect(create?.querySelector('#injected')).toBeNull();
    expect(create?.textContent).toContain('"<b id="injected">x</b>"');
    expect(create?.querySelector('translate-text')?.getAttribute('alias')).toBe('post-tags-input.create-tag');
  });

  test('does not offer to create a tag that exists', async () => {
    const element = mount();
    type(element, 'news');
    page.flushTimers();

    await reply(200, [{ id: TAG_ID, name: 'news', type: 'text' }]);

    expect(element.querySelectorAll('.results .tagResult')).toHaveLength(1);
  });

  test('clears the results when the input is emptied', async () => {
    const element = mount();
    type(element, 'news');
    page.flushTimers();
    await reply(200, []);

    type(element, '');

    expect(element.querySelector('.results')?.innerHTML).toBe('');
  });

  test('assigns a tag to the post and lists it', async () => {
    const element = mount();

    const added = element.add(TAG_ID);
    await flush();
    expect(page.requests[0]).toMatchObject({ method: 'POST', url: '/api/posts/p1/tags', body: JSON.stringify({ id: TAG_ID }) });
    await reply(200);
    expect(page.requests[0]).toMatchObject({ method: 'GET', url: `/api/tags/${TAG_ID}` });
    await reply(200, { id: TAG_ID, name: 'news', type: 'text' });
    await added;

    expect(element.tagIds).toEqual([TAG_ID]);
    expect(element.querySelector('.tagElement .label')?.textContent).toBe('news');
    expect(element.querySelector('.tagElement .remove')?.getAttribute('title')).toBe('t:post-tags-input.remove-tag.title');
  });

  test('lists a tag without assigning it when asked', async () => {
    const element = mount();

    const added = element.add(TAG_ID, false);
    await reply(200, { id: TAG_ID, name: 'news', type: 'text' });
    await added;

    expect(page.requests.some(request => request.method === 'POST')).toBe(false);
    expect(element.tagIds).toEqual([TAG_ID]);
  });

  test('does not list a tag twice', async () => {
    const element = mount();
    const added = element.add(TAG_ID, false);
    await reply(200, { id: TAG_ID, name: 'news', type: 'text' });
    await added;

    await element.add(TAG_ID, false);

    expect(element.tagIds).toEqual([TAG_ID]);
  });

  test('removes a tag from the post and from the list', async () => {
    const element = mount();
    const added = element.add(TAG_ID, false);
    await reply(200, { id: TAG_ID, name: 'news', type: 'text' });
    await added;

    (element.querySelector('.tagElement .remove') as HTMLElement).click();
    await flush();
    expect(page.requests[0]).toMatchObject({ method: 'DELETE', url: `/api/posts/p1/tags/${TAG_ID}` });
    await reply(200);

    expect(element.tagIds).toEqual([]);
  });

  test('creates a tag', async () => {
    const element = mount();

    const created = element.createTag('fresh');
    await flush();

    expect(page.requests[0]).toMatchObject({ method: 'POST', url: '/api/tags', body: JSON.stringify({ name: 'fresh', type: 'text' }) });
    await reply(200, { id: 't9', name: 'fresh', type: 'text' });
    await created;
  });
});

describe('moderation-page', () => {
  beforeEach(async () => {
    page = await loadComponents(['translate-text', 'post-tags-input', 'moderation-page']);
    stubTranslations();
    page.window.getPost = vi.fn().mockResolvedValue({ tags: [], content: 'hello #fresh' });
    page.window.alert = vi.fn();
  });

  const pending = [{ id: 'p1', type: 'post', created_at: 100 }];
  const mount = async (posts: unknown[] = pending) => {
    const element = page.mount('<moderation-page></moderation-page>');
    await flush();
    await reply(200, posts);
    return element;
  };

  test('lists pending posts for moderation', async () => {
    const element = await mount();

    expect(page.requests).toHaveLength(0);
    expect(element.querySelector('.loading')?.classList.contains('hidden')).toBe(true);
    const wrapper = element.querySelector('.postModerationWrapper');
    expect(wrapper?.getAttribute('post-id')).toBe('p1');
    expect(wrapper?.querySelector('post-tags-input')?.getAttribute('post-id')).toBe('p1');
  });

  test('suggests creating tags that are written in the post but do not exist', async () => {
    const element = await mount();

    expect(element.querySelector('.newTags')?.getAttribute('style')).not.toContain('none');
    expect(element.querySelector('.newTagsItem .label')?.textContent).toBe('#fresh');
  });

  test('says when there is nothing to moderate', async () => {
    const element = await mount([]);
    expect(element.querySelector('.noPostsMessage')).not.toBeNull();
  });

  test('polls for newer posts every five seconds', async () => {
    await mount();
    expect(page.pendingTimers().map(timer => timer.delay)).toContain(5000);

    page.flushTimers();
    await flush();

    expect(page.requests[0].url).toBe('/api/posts?status=pending&since=101');
  });

  test('does not duplicate posts it already shows', async () => {
    const element = await mount();
    page.flushTimers();
    await reply(200, pending);

    expect(element.querySelectorAll('.postModerationWrapper')).toHaveLength(1);
  });

  test('refuses to approve a post without tags', async () => {
    const element = await mount();

    (element.querySelector('.approve') as HTMLElement).click();
    await flush();

    expect(page.window.alert).toHaveBeenCalledWith('t:moderation-page.posts.no-tags-alert');
    expect(page.requests).toHaveLength(0);
  });

  test('approves a tagged post', async () => {
    const element = await mount();
    const tagsInput = element.querySelector('post-tags-input') as HTMLElement & { add: (id: string, assign: boolean) => Promise<void> };
    const added = tagsInput.add(TAG_ID, false);
    await reply(200, { id: TAG_ID, name: 'news', type: 'text' });
    await added;

    (element.querySelector('.approve') as HTMLElement).click();
    await flush();

    expect(page.requests[0]).toMatchObject({ method: 'PUT', url: '/api/posts/p1', body: JSON.stringify({ status: 'public' }) });
  });

  test('disapproves a post', async () => {
    const element = await mount();

    (element.querySelector('.disapprove') as HTMLElement).click();

    expect(page.requests[0]).toMatchObject({ method: 'PUT', url: '/api/posts/p1', body: JSON.stringify({ status: 'moderated' }) });
  });
});

describe('profile-page', () => {
  beforeEach(async () => {
    page = await loadComponents(['translate-text', 'profile-page']);
    stubTranslations();
    page.window.alert = vi.fn();
  });

  const sessions = [
    { userId: 'u1', sessionId: 's1', sessionStatus: 'active', sessionCreatedAt: 1, loginType: 'email', lastActive: 2, details: { userAgent: 'UA', remoteAddress: null } },
    { userId: 'u1', sessionId: 's2', sessionStatus: 'pending', sessionCreatedAt: 1, loginType: 'other', lastActive: null, details: null },
  ];
  const mount = async () => {
    const element = page.mount('<profile-page session-id="s1"></profile-page>');
    await reply(200, {
      user: { id: 'u1', name: 'Ann', role: 'user', created_at: 1 },
      session: { id: 's1', users_login_id: 'l1', status: 'active', created_at: 1, last_active: null },
      login: { id: 'l1', type: 'email', user_id: 'u1', value: 'a@b.c' },
    });
    await reply(200, sessions);
    return element;
  };

  test('shows the current name and requests the tag preferences', async () => {
    const element = await mount();

    expect((element.querySelector('.name') as HTMLInputElement).value).toBe('Ann');
    expect(page.redux.dispatched()).toContainEqual({ type: 'USER_REQUEST_TAGS', payload: {} });
  });

  test('sets the rename input texts from translations', async () => {
    const element = await mount();
    expect(element.querySelector('.name')?.getAttribute('placeholder')).toBe('t:profile-page.rename.input.placeholder');
    expect(element.querySelector('.name')?.getAttribute('title')).toBe('t:profile-page.rename.input.title');
  });

  test('lists the sessions and marks the current one', async () => {
    const element = await mount();
    const items = [...element.querySelectorAll('.session')];

    expect(items).toHaveLength(2);
    expect(items[0].classList.contains('current')).toBe(true);
    expect(items[0].getAttribute('title')).toBe('UA');
    expect(items[0].querySelector('x-icon')?.getAttribute('type')).toBe('emailLogin');
    expect(items[0].querySelector('translate-text')?.getAttribute('alias')).toBe('profile-page.session-list.session.status.active');
    expect(items[1].classList.contains('current')).toBe(false);
    expect(items[1].querySelector('.type')?.textContent?.trim()).toBe('other');
  });

  test('warns instead of ending the current session', async () => {
    const element = await mount();

    (element.querySelector('.session.current .exit') as HTMLElement).click();
    await flush();

    expect(page.window.alert).toHaveBeenCalledWith('t:profile-page.session-list.session.current.exit-alert');
    expect(page.requests).toHaveLength(0);
  });

  test('ends another session', async () => {
    const element = await mount();

    (element.querySelectorAll('.session')[1].querySelector('.exit') as HTMLElement).click();
    await flush();
    expect(page.requests[0]).toMatchObject({ method: 'DELETE', url: '/api/user/sessions/s2' });
    await reply(200);

    expect(element.querySelectorAll('.session')).toHaveLength(1);
  });

  test('renames the user', async () => {
    const element = await mount();
    (element.querySelector('.name') as HTMLInputElement).value = 'Bob';

    (element.querySelector('.renameUserWrapper .button') as HTMLElement).click();

    expect(page.requests[0]).toMatchObject({ method: 'PUT', url: '/api/user/name', body: JSON.stringify({ name: 'Bob' }) });
  });

  test('does not rename to an empty name', async () => {
    const element = await mount();
    (element.querySelector('.name') as HTMLInputElement).value = '';

    (element.querySelector('.renameUserWrapper .button') as HTMLElement).click();

    expect(page.requests).toHaveLength(0);
  });

  test('offers the data export as a download', async () => {
    const element = await mount();

    expect(element.querySelector('.exportData')?.getAttribute('href')).toBe('/api/user/export');
  });

  test('requests a code, then deletes the account with it', async () => {
    const element = await mount();
    page.window.prompt = vi.fn(() => 'abc123');

    (element.querySelector('.deleteAccount') as HTMLElement).click();
    await flush();
    expect((await reply(200, {})).method).toBe('POST');
    await flush();

    expect(page.window.prompt).toHaveBeenCalledWith('t:profile-page.delete.code-sent');
    expect(page.requests[0]).toMatchObject({ method: 'DELETE', url: '/api/user', body: JSON.stringify({ code: 'abc123' }) });
  });

  test('does not delete without a code', async () => {
    const element = await mount();
    page.window.prompt = vi.fn(() => null);

    (element.querySelector('.deleteAccount') as HTMLElement).click();
    await reply(200, {});
    await flush();

    expect(page.requests).toHaveLength(0);
  });

  test('says when the deletion failed', async () => {
    const element = await mount();
    page.window.prompt = vi.fn(() => 'ABC123');

    (element.querySelector('.deleteAccount') as HTMLElement).click();
    await reply(200, {});
    await reply(400);
    await flush();

    expect(page.window.alert).toHaveBeenCalledWith('t:profile-page.delete.failed');
  });

  test('lists liked and disliked tags once known', async () => {
    const element = await mount();

    page.redux.setState({ user: { role: 'user', received: true, session: null, tags: [{ tag_id: 'a', type: 'liked' }, { tag_id: 'b', type: 'disliked' }] } });

    expect(element.querySelector('.likedTags .list tag-inline')?.getAttribute('tag-id')).toBe('a');
    expect(element.querySelector('.dislikedTags .list tag-inline')?.getAttribute('tag-id')).toBe('b');
  });

  test('says when there are no preferences', async () => {
    const element = await mount();

    page.redux.setState({ user: { role: 'user', received: true, session: null, tags: [{ tag_id: 'x', type: 'other' }] } });

    expect(element.querySelector('.likedTags .list')?.textContent).toBe('No liked tags');
    expect(element.querySelector('.dislikedTags .list')?.textContent).toBe('No disliked tags');
  });
});

describe('user-roles', () => {
  beforeEach(async () => {
    page = await loadComponents(['translate-text', 'user-roles']);
    stubTranslations();
  });

  const users = [
    { id: 'u1', name: 'Ann', role: 'admin', created_at: 1 },
    { id: 'u2', name: null, role: 'user', created_at: 2 },
  ];

  test('lists users with their roles', async () => {
    const element = page.mount('<user-roles></user-roles>');
    await flush();
    expect(page.requests[0]).toMatchObject({ method: 'GET', url: '/api/users' });
    await reply(200, users);

    const rows = [...element.querySelectorAll('.user')];
    expect(rows.map(row => row.querySelector('.name')?.textContent)).toEqual(['Ann', 'u2']);
    expect(rows.map(row => row.querySelector('.role')?.textContent)).toEqual(['admin', 'user']);
  });

  test('promotes a user and reloads the list', async () => {
    const element = page.mount('<user-roles></user-roles>');
    await flush();
    await reply(200, users);

    (element.querySelector('[user-id="u2"] .toggle') as HTMLElement).click();
    await flush();
    expect(page.requests[0]).toMatchObject({ method: 'PUT', url: '/api/users/u2', body: JSON.stringify({ role: 'admin' }) });
    await reply(200);
    await flush();
    expect(page.requests[0]).toMatchObject({ method: 'GET', url: '/api/users' });
  });

  test('demotes an admin', async () => {
    const element = page.mount('<user-roles></user-roles>');
    await flush();
    await reply(200, users);

    (element.querySelector('[user-id="u1"] .toggle') as HTMLElement).click();
    await flush();
    expect(page.requests[0]).toMatchObject({ method: 'PUT', url: '/api/users/u1', body: JSON.stringify({ role: 'user' }) });
  });
});
