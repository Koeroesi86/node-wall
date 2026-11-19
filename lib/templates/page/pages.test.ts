import { describe, expect, test, vi } from 'vitest';
import login from './login';
import moderation from './moderation';
import post from './post';
import privacy from './privacy';
import profile from './profile';
import tag from './tag';
import wall from './wall';
import welcome from './welcome';
import wrapper from './wrapper';

vi.mock('../../utils/loadRenderer', async () => {
  // the server rendering bundle only exists after a build, so the tests render the React source
  const { renderPage } = await import('../../../web/render-page.tsx');
  return { loadRenderer: () => renderPage };
});
vi.mock('crypto', () => ({ randomUUID: () => 'generated-instance' }));

const SID = '123e4567-e89b-12d3-a456-426614174000';

describe('wrapper', () => {
  test('renders defaults', () => {
    const html = wrapper();
    expect(html).toContain('<title>Üzenőfal</title>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta name="x-language" content="en-GB" />');
    expect(html).toContain('id="initial-state">{}</script>');
  });

  test('renders the given props', () => {
    const html = wrapper({
      siteName: 'Wall',
      title: 'Home',
      language: 'hu-HU',
      sessionId: SID,
      content: '<p>content</p>',
      headers: '<script src="/x.js"></script>',
      initialState: { a: 1 },
    });
    expect(html).toContain('<title>Wall :: Home</title>');
    expect(html).toContain('<html lang="hu">');
    expect(html).toContain(`<meta name="x-session-id" content="${SID}" />`);
    expect(html).toContain(`<navigation-wrapper session-id="${SID}">`);
    expect(html).toContain('<p>content</p>');
    expect(html).toContain('<script src="/x.js"></script>');
    expect(html).toContain('id="initial-state">{"a":1}</script>');
  });
});

describe('pages', () => {
  const props = { language: 'hu-HU', sessionId: SID };

  test.each([
    ['moderation', moderation, '<moderation-page></moderation-page>', 'moderation-page.js'],
    ['profile', profile, `<profile-page session-id="${SID}"></profile-page>`, 'profile-page.js'],
  ])('%s renders its component inside the wrapper', (_name, render, content, script) => {
    const html = render(props);
    expect(html).toContain(content);
    expect(html).toContain(`/static/components/${script}`);
    expect(html).toContain('<html lang="hu">');
    expect(html).toContain(`<meta name="x-session-id" content="${SID}" />`);
  });

  test('login renders the form and the pending session', () => {
    expect(login(props)).toContain('<div class="login-page">');
    expect(login({ ...props, session: 'abc' })).toContain('"session":"abc"');
  });

  test('welcome renders inside the wrapper', () => {
    const html = welcome(props);
    expect(html).toContain('<div id="root" data-page="welcome"><div class="welcome-page">');
    expect(html).toContain('<html lang="hu">');
    expect(html).toContain('Üdv');
  });

  test('privacy renders the operator details', () => {
    vi.stubEnv('PRIVACY_CONTROLLER', 'Op');
    vi.stubEnv('PRIVACY_CONTACT_EMAIL', 'me@example.com');

    expect(privacy(props)).toContain('<div class="controller">Op</div>');
    expect(privacy(props)).toContain('href="mailto:me@example.com"');
    vi.unstubAllEnvs();
  });

  test('post renders the post id', () => {
    expect(post({ ...props, postId: 'p1' })).toContain('<post-page post-id="p1"></post-page>');
  });

  test('tag renders the tag attributes', () => {
    expect(tag({ ...props, tag: { id: 't1', name: 'news', type: 'text' } }))
      .toContain('<tag-page tag-id="t1" tag-name="news" tag-type="text"></tag-page>');
  });

  test('tag renders empty attributes without a tag', () => {
    expect(tag()).toContain('<tag-page tag-id="" tag-name="" tag-type=""></tag-page>');
  });

  test('wall uses the given instance', () => {
    expect(wall({ instance: 'i1' })).toContain('<div id="root" data-page="wall"><div class="post-wall"><div class="compose-post"><div class="post-editor">')
    expect(wall({ instance: 'i1' })).toContain('"instance":"i1"');
  });

  test('wall generates an instance when none is given', () => {
    expect(wall()).toContain('"instance":"generated-instance"');
  });

  test('pages work without props', () => {
    [login, welcome, moderation, profile, post].forEach(render => expect(render()).toContain('<!DOCTYPE html>'));
  });
});

describe('wrapper escaping', () => {
  test('drops a session id that is not a UUID', () => {
    const html = wrapper({ sessionId: '"><script>alert(1)</script>' });
    expect(html).toContain('<meta name="x-session-id" content="" />');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  test('escapes the language', () => {
    const html = wrapper({ language: '"><script>x</script>' });
    expect(html).not.toContain('<script>x</script>');
  });
});

describe('wrapper initial state', () => {
  test('cannot close the script element', () => {
    const html = wrapper({ initialState: { a: '</script><script>alert(1)</script>' } });
    expect(html).not.toContain('</script><script>alert(1)');
  });

  test('loads third-party scripts from this origin', () => {
    expect(wrapper()).not.toMatch(/src="https?:\/\//);
  });
});
