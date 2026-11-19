import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import getTranslations from '../lib/translations/getTranslations';
import { renderMarkup } from './translation-markup.tsx';

const html = (markup: string) => renderToStaticMarkup(<>{renderMarkup(markup)}</>);

describe('translation markup', () => {
  test('keeps plain text, escaped', () => {
    expect(html('Hello & <b>welcome</b> <3')).toBe('Hello &amp; welcome &lt;3');
  });

  test('renders the elements and attributes the translations use', () => {
    expect(html('<h4>Title</h4><p>See the <a href="/privacy" rel="noopener noreferrer">notice</a>.<br /></p><ul><li>one</li><li>two</li></ul>'))
      .toBe('<h4>Title</h4><p>See the <a href="/privacy" rel="noopener noreferrer">notice</a>.<br/></p><ul><li>one</li><li>two</li></ul>');
  });

  test('renders the logout form', () => {
    const form = html('<form action="/logout" method="post" class="logoutInline"><button type="submit">Log out</button></form>');

    expect(form).toMatch(/^<form [^>]*>/);
    ['action="/logout"', 'method="post"', 'class="logoutInline"'].forEach(attribute => expect(form).toContain(attribute));
    expect(form).toContain('<button type="submit">Log out</button></form>');
  });

  test.each([
    ['a script', '<script>alert(1)</script>x', 'alert(1)x'],
    ['an event handler', '<a href="/x" onclick="alert(1)">y</a>', '<a href="/x">y</a>'],
    ['a style attribute', '<p style="color:red">y</p>', '<p>y</p>'],
    ['an image (shown as text)', '<img src=x onerror=alert(1)>', '&lt;img src=x onerror=alert(1)&gt;'],
  ])('drops %s', (_name, markup, expected) => {
    expect(html(markup)).toBe(expected);
  });

  test.each([
    'javascript:alert(1)',
    ' javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,x',
    '//evil.example/x',
    'vbscript:x',
  ])('drops the link target %s', (target) => {
    expect(html(`<a href="${target}">y</a>`)).toBe('<a>y</a>');
  });

  test('keeps links to this site, http(s) and mail', () => {
    expect(html('<a href="https://naih.hu">a</a><a href="http://x.example/y?z=1&amp;w=2">b</a><a href="mailto:a@b.c">c</a>'))
      .toBe('<a href="https://naih.hu">a</a><a href="http://x.example/y?z=1&amp;w=2">b</a><a href="mailto:a@b.c">c</a>');
  });

  test('closes what was left open and ignores stray closing tags', () => {
    expect(html('<p>one</li></p>two<ul><li>x')).toBe('<p>one</p>two<ul><li>x</li></ul>');
  });

  test('never brings markup out of text', () => {
    expect(html('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

describe('the translations of the site', () => {
  const tagCount = (value: string) => (value.match(/<\/?[a-z][^>]*>/gi) ?? []).length;

  test.each(['en-GB', 'hu-HU'])('%s keeps all of its markup and brings in nothing else', (language) => {
    Object.entries(getTranslations(language)).forEach(([alias, value]) => {
      const rendered = html(value);

      expect(tagCount(rendered), alias).toBe(tagCount(value));
      expect(rendered, alias).not.toMatch(/<script|\son[a-z]+=|javascript:|style=/i);
    });
  });
});
