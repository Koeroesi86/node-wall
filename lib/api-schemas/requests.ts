import { z } from 'zod';
import {
  CommentBodySchema, EmailSchema, IdSchema, LoginTypes, NameSchema, PostContentSchema, PostStatuses, TagNameSchema, TagTypes,
  UserRoles, UserTagTypes,
} from './common';

export const CreatePostRequestSchema = z.object({ content: PostContentSchema });

export const SetPostStatusRequestSchema = z.object({ status: z.enum(PostStatuses) });

export const AddPostTagRequestSchema = z.object({ id: IdSchema });

export const CreateCommentRequestSchema = z.object({
  postId: IdSchema,
  parent: IdSchema.optional(),
  body: CommentBodySchema,
});

export const CreateTagRequestSchema = z.object({ name: TagNameSchema, type: z.enum(TagTypes) });

export const LoginRequestSchema = z.object({
  type: z.enum(LoginTypes),
  value: EmailSchema,
  name: NameSchema.optional(),
});

export const SetUserRoleRequestSchema = z.object({ role: z.enum(UserRoles) });

export const SetUserNameRequestSchema = z.object({ name: NameSchema });

export const SetUserTagRequestSchema = z.object({ id: IdSchema, type: z.enum(UserTagTypes) });

export const RemoveUserTagRequestSchema = z.object({ id: IdSchema });

/** The code emailed by the deletion request. */
export const DeleteAccountRequestSchema = z.object({ code: z.string().trim().regex(/^[A-Z0-9]{6}$/i) });
