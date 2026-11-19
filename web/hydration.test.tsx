// @vitest-environment jsdom
import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PageRoot } from './page-root.tsx';
import { pages } from './pages.ts';
import { fakeFetch } from './test-utils/fetch.ts';
import { fakeRedux } from './test-utils/redux.ts';

const props: Record<string, Record<string, unknown>> = {
  wall: { instance: 'i1' },
  login: { session: 'abc' },
  post: { postId: 'p1' },
  tag: { tagId: 't1', tagName: 'news' },
  profile: { sessionId: 's1' },
  privacy: { controller: 'Op', contact: 'me@example.com' },
};
const translations = { 'navigation-wrapper.home': 'Home', 'privacy-page.header': 'Privacy', 'welcome-page.header': 'Hello' };

let redux: ReturnType<typeof fakeRedux>;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  fakeFetch({
    'GET /api/users': { body: [] },
    'GET /api/users/audit': { body: [] },
    'GET /api/posts?status=pending': { body: [] },
    'GET /api/user': { body: { user: { id: 'u1', name: '', role: 'user', created_at: 1 }, session: { id: 's1', users_login_id: 'l1', status: 'active', created_at: 1, last_active: null }, login: { id: 'l1', type: 'email', user_id: 'u1', value: 'a@b.c' } } },
    'GET /api/user/sessions': { body: [] },
  });
  redux = fakeRedux();
  redux.setState({ posts: {}, postsList: {}, tags: {}, links: {}, comments: {}, bounds: { newest: null, oldest: null }, user: { received: false, role: 'guest', tags: null, session: null } });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('hydration', () => {
  test.each(Object.keys(pages))('the %s page hydrates the markup the server rendered', async (name) => {
    const pageProps = { ...props[name], translations };
    const container = document.createElement('div');
    document.body.append(container);
    container.innerHTML = renderToString(<PageRoot name={name} props={pageProps} />);
    const html = container.innerHTML;
    const mismatches: unknown[] = [];
    const warnings = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await act(async () => {
      hydrateRoot(container, <PageRoot name={name} props={pageProps} />, { onRecoverableError: error => mismatches.push(error) });
    });

    expect(mismatches).toEqual([]);
    expect(warnings.mock.calls).toEqual([]);
    expect(container.querySelector('.content-wrapper')).not.toBeNull();
    expect(container.innerHTML.length).toBeGreaterThanOrEqual(html.length - 200);
  });

  test('every page of the site is registered', () => {
    expect(Object.keys(pages).sort()).toEqual(['login', 'moderation', 'post', 'privacy', 'profile', 'tag', 'wall', 'welcome']);
  });
});
