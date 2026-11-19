// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { fakeRedux } from './test-utils/redux.ts';
import { CommentContent, PostContent } from './post-content.tsx';

const TAG_ID = '11111111-2222-3333-4444-555555555555';

const post = (content: unknown, postId = 'p1') => render(<PostContent content={content} postId={postId} />).container;
const comment = (content: string) => render(<CommentContent content={content} />).container;

beforeEach(() => {
  const redux = fakeRedux();
  redux.setState({ tags: {}, links: {}, user: { role: 'guest', tags: [] } });
});

afterEach(cleanup);

describe('post content', () => {
  test('wraps every line', () => {
    expect(post('one\ntwo').innerHTML).toBe('<div class="contentLine">one</div><div class="contentLine">two</div>');
  });

  test('trims the content and collapses runs of blank lines', () => {
    expect(post('  one\n\n\n\n\ntwo  ').innerHTML).toBe('<div class="contentLine">one</div><div class="contentLine">&nbsp;</div><div class="contentLine">two</div>');
  });

  test('turns urls into link previews', () => {
    const container = post('see https://example.com/a?b=1 now');

    expect(container.querySelector('a.link-preview')?.getAttribute('href')).toBe('https://example.com/a?b=1');
    expect(container.textContent).toBe('see https://example.com/a?b=1 now');
  });

  test('turns www addresses into https link previews', () => {
    const container = post('go to www.example.com');

    expect(container.querySelector('a.link-preview')?.getAttribute('href')).toBe('https://www.example.com');
    expect(container.textContent).toBe('go to https://www.example.com');
  });

  test('turns tag references into tags', () => {
    const container = post(`about #!${TAG_ID}`);

    expect(container.querySelectorAll('.tag-inline')).toHaveLength(1);
    expect(container.textContent?.startsWith('about ')).toBe(true);
  });

  test('escapes markup in the content', () => {
    const container = post('<b>bold</b><script>alert(1)</script>');

    expect(container.querySelector('b, script')).toBeNull();
    expect(container.textContent).toBe('<b>bold</b><script>alert(1)</script>');
  });

  test('restores the < the server stored as an entity, and nothing else', () => {
    expect(post('&lt;img src=x onerror=alert(1)&gt;').innerHTML).toBe('<div class="contentLine">&lt;img src=x onerror=alert(1)&amp;gt;</div>');
    expect(post('&amp;lt;b&amp;gt;').querySelector('b')).toBeNull();
  });

  test('handles content that is not a string', () => {
    expect(post(undefined).innerHTML).toBe('<div class="contentLine">undefined</div>');
  });
});

describe('comment content', () => {
  test('wraps every line', () => {
    expect(comment('one\ntwo').innerHTML).toBe('<div class="line">one</div><div class="line">two</div>');
  });

  test('keeps blank lines visible and collapses long runs', () => {
    expect(comment('one\n\n\n\n\ntwo').innerHTML).toBe('<div class="line">one</div><div class="line">&nbsp;</div><div class="line">two</div>');
  });

  test('escapes markup', () => {
    expect(comment('<img src=x onerror=alert(1)>').innerHTML).toBe('<div class="line">&lt;img src=x onerror=alert(1)&gt;</div>');
  });

  test('trims the content', () => {
    expect(comment('  hi  ').innerHTML).toBe('<div class="line">hi</div>');
  });
});
