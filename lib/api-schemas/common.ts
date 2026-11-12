import { z } from 'zod';

export const PostStatuses = ['public', 'pending', 'moderated', 'deleted'] as const;
export const UserRoles = ['admin', 'user'] as const;
export const UserTagTypes = ['liked', 'disliked'] as const;
export const TagTypes = ['text'] as const;
export const LoginTypes = ['email'] as const;

export const PostContentMaxLength = 5000;
export const CommentBodyMaxLength = 2000;
export const TagNameMaxLength = 50;

export const IdSchema = z.guid();

/** Shared by signup and rename, so both accept exactly the same names. */
export const NameSchema = z.string().trim().regex(/^[\p{L}\p{N} .'_-]{1,50}$/u);

/** Mirrors the `#tag` syntax that posts are scanned for. */
export const TagNameSchema = z.string().trim().max(TagNameMaxLength).regex(/^[a-z\u00C0-\u017F0-9]+$/i);

export const PostContentSchema = z.string().trim().min(1).max(PostContentMaxLength);
export const CommentBodySchema = z.string().trim().min(1).max(CommentBodyMaxLength);

/** True only for one plain address: no list separators, whitespace, quotes, angle brackets or control characters. */
export const EmailSchema = z.string().max(254).regex(
  /^[^\s@,;<>()[\]\\":\u0000-\u001f]+@[^\s@,;<>()[\]\\":\u0000-\u001f]+\.[^\s@,;<>()[\]\\":\u0000-\u001f]+$/,
);

/** SQLite has no date type: column defaults (CURRENT_TIMESTAMP) are stored as text, while the app writes epoch milliseconds. */
export const TimestampSchema = z.union([z.string(), z.number()]).nullable();
