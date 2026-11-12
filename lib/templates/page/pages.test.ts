import { describe, expect, test, vi } from 'vitest';
import login from './login';
import moderation from './moderation';
import post from './post';
import profile from './profile';
import tag from './tag';
import wall from './wall';
import welcome from './welcome';
import wrapper from './wrapper';

vi.mock('uuid', () => ({ v4: () => 'generated-instance' }));

describe('wrapper', () => {
  test('renders defaults', () => {
    const html = wrapper();
    expect(html).toContain('<title>Üzenőfal</title>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta name="x-language" content="en-GB" />');
    expect(html).toContain(`window['__STATE__'] = {};`);
  });

  test('renders the given props', () => {
    const html = wrapper({
      siteName: 'Wall',
      title: 'Home',
      language: 'hu-HU',
      sessionId: 's1',
      content: '<p>content</p>',
      headers: '<script src="/x.js"></script>',
      initialState: { a: 1 },
    });
    expect(html).toContain('<title>Wall :: Home</title>');
    expect(html).toContain('<html lang="hu">');
    expect(html).toContain('<meta name="x-session-id" content="s1" />');
    expect(html).toContain('<navigation-wrapper session-id="s1">');
    expect(html).toContain('<p>content</p>');
    expect(html).toContain('<script src="/x.js"></script>');
    expect(html).toContain(`window['__STATE__'] = {"a":1};`);
  });
});

describe('pages', () => {
  const props = { language: 'hu-HU', sessionId: 's1' };

  test.each([
    ['login', login, '<login-page></login-page>', 'login-page.js'],
    ['welcome', welcome, '<welcome-page></welcome-page>', 'welcome-page.js'],
    ['moderation', moderation, '<moderation-page></moderation-page>', 'moderation-page.js'],
    ['profile', profile, '<profile-page session-id="s1"></profile-page>', 'profile-page.js'],
  ])('%s renders its component inside the wrapper', (_name, render, content, script) => {
    const html = render(props);
    expect(html).toContain(content);
    expect(html).toContain(`/static/components/${script}`);
    expect(html).toContain('<html lang="hu">');
    expect(html).toContain('<meta name="x-session-id" content="s1" />');
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
    expect(wall({ instance: 'i1' })).toContain('<post-wall instance="i1"></post-wall>');
  });

  test('wall generates an instance when none is given', () => {
    expect(wall()).toContain('<post-wall instance="generated-instance"></post-wall>');
  });

  test('pages work without props', () => {
    [login, welcome, moderation, profile, post].forEach(render => expect(render()).toContain('<!DOCTYPE html>'));
  });
});
