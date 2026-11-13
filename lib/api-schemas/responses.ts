import { z } from 'zod';
import { AuditLogSchema, PostsCommentsSchema, TagsSchema, UsersLoginSchema, UsersSchema, UsersSessionSchema, UsersTagsSchema } from '../data-schemas';
import { TimestampSchema } from './common';

export const TagResponseSchema = TagsSchema;
export const TagListResponseSchema = TagResponseSchema.array();

export const UserResponseSchema = UsersSchema.pick({ id: true, name: true, role: true }).extend({ created_at: TimestampSchema });
export const UserListResponseSchema = UserResponseSchema.array();

export const AuditEntryResponseSchema = AuditLogSchema.omit({ id: true }).extend({ user_name: UsersSchema.shape.name });
export const AuditListResponseSchema = AuditEntryResponseSchema.array();

/** What anybody may learn about a post owner. */
export const PostOwnerSchema = UsersSchema.pick({ name: true }).extend({ id: UsersSchema.shape.id.optional() });

export const PostSummarySchema = z.object({ id: z.string(), type: z.string().nullable(), created_at: TimestampSchema });
export const PostListResponseSchema = PostSummarySchema.array();

export const PostResponseSchema = PostSummarySchema.extend({
  content: z.string(),
  comments: z.string().array(),
  owner: PostOwnerSchema.nullable(),
  tags: TagListResponseSchema,
});

export const CommentResponseSchema = PostsCommentsSchema.omit({ owner: true, status: true }).extend({ created_at: TimestampSchema, body: z.string() });

export const BoundsResponseSchema = z.object({ oldest: TimestampSchema, newest: TimestampSchema });

export const UserTagListResponseSchema = UsersTagsSchema.pick({ tag_id: true, type: true }).array();

export const UserInfoResponseSchema = z.object({
  user: UserResponseSchema,
  session: UsersSessionSchema.pick({ id: true, users_login_id: true, status: true, last_active: true }).extend({ created_at: TimestampSchema }),
  login: UsersLoginSchema.pick({ id: true, type: true, user_id: true, value: true }),
});

export const SessionListResponseSchema = z.object({
  userId: z.string(),
  loginType: z.string().nullable(),
  sessionStatus: z.string().nullable(),
  sessionCreatedAt: z.union([z.number(), z.nan()]),
  sessionId: z.string(),
  lastActive: z.number().nullable(),
  details: z.object({ userAgent: z.string().nullable(), remoteAddress: z.string().nullable() }).nullable(),
}).array();

export const LoginResponseSchema = z.object({ sessionId: z.string() });

export const LinkResponseSchema = z.object({
  'content-type': z.string(),
  title: z.string(),
  description: z.string(),
  image: z.string(),
  url: z.string(),
  embedCode: z.string(),
});

export const EmptyResponseSchema = z.object({});
