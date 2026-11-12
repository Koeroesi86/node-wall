import { describe, expect, test } from 'vitest';
import {
  CreateCommentRequestSchema, CreatePostRequestSchema, CreateTagRequestSchema, LoginRequestSchema, NameSchema,
  SetUserNameRequestSchema, SetUserTagRequestSchema,
} from '.';

const ID = '11111111-2222-3333-4444-555555555555';

describe('NameSchema', () => {
  test.each(['Ann', 'Éva Nagy', "O'Neil-Smith_1.", '  padded  '])('accepts %s', (name) => {
    expect(NameSchema.safeParse(name).success).toBe(true);
  });

  test('trims', () => {
    expect(NameSchema.parse('  Ann ')).toBe('Ann');
  });

  test.each(['', '   ', '<b>x</b>', 'a'.repeat(51), 5, undefined])('rejects %s', (name) => {
    expect(NameSchema.safeParse(name).success).toBe(false);
  });

  test('is shared by signup and rename', () => {
    const bad = '<img src=x>';
    expect(LoginRequestSchema.safeParse({ type: 'email', value: 'a@b.c', name: bad }).success).toBe(false);
    expect(SetUserNameRequestSchema.safeParse({ name: bad }).success).toBe(false);
  });
});

describe('LoginRequestSchema', () => {
  test('the name is optional', () => {
    expect(LoginRequestSchema.parse({ type: 'email', value: 'a@b.c' })).toEqual({ type: 'email', value: 'a@b.c' });
  });

  test.each([
    [{ type: 'phone', value: '123' }],
    [{ type: 'email', value: 5 }],
    [{ type: 'email', value: 'a@b.c, d@e.f' }],
    [{ type: 'email' }],
  ])('rejects %j', (body) => {
    expect(LoginRequestSchema.safeParse(body).success).toBe(false);
  });
});

describe('content', () => {
  test('is trimmed and must not be empty or too long', () => {
    expect(CreatePostRequestSchema.parse({ content: ' hi ' })).toEqual({ content: 'hi' });
    expect(CreatePostRequestSchema.safeParse({ content: '  ' }).success).toBe(false);
    expect(CreatePostRequestSchema.safeParse({ content: 'a'.repeat(5001) }).success).toBe(false);
    expect(CreateCommentRequestSchema.safeParse({ postId: ID, body: 'a'.repeat(2001) }).success).toBe(false);
  });

  test('comments need a post id and an optional parent id', () => {
    expect(CreateCommentRequestSchema.safeParse({ postId: ID, parent: ID, body: 'hi' }).success).toBe(true);
    expect(CreateCommentRequestSchema.safeParse({ postId: ID, parent: 'c0', body: 'hi' }).success).toBe(false);
    expect(CreateCommentRequestSchema.safeParse({ body: 'hi' }).success).toBe(false);
  });
});

describe('tags', () => {
  test('tag names follow the hashtag syntax and the type is restricted', () => {
    expect(CreateTagRequestSchema.safeParse({ name: 'híradó', type: 'text' }).success).toBe(true);
    expect(CreateTagRequestSchema.safeParse({ name: 'two words', type: 'text' }).success).toBe(false);
    expect(CreateTagRequestSchema.safeParse({ name: 'news', type: 'other' }).success).toBe(false);
  });

  test('user tags are liked or disliked', () => {
    expect(SetUserTagRequestSchema.safeParse({ id: ID, type: 'liked' }).success).toBe(true);
    expect(SetUserTagRequestSchema.safeParse({ id: ID, type: 'loved' }).success).toBe(false);
    expect(SetUserTagRequestSchema.safeParse({ id: 'x', type: 'liked' }).success).toBe(false);
  });
});
