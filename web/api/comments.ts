import { CommentResponseSchema, CreateCommentRequestSchema, EmptyResponseSchema } from '../../lib/api-schemas';
import { send } from './posts.ts';

export const getComment = (id: string) => send('GET', `/api/comment/${id}`).then(request => CommentResponseSchema.parse(JSON.parse(request.responseText)));

export const createComment = (postId: string, body: string, parent?: string) => Promise.resolve()
  .then(() => CreateCommentRequestSchema.parse({ body, parent, postId }))
  .then(payload => send('POST', '/api/comment', payload))
  .then(request => void EmptyResponseSchema.parse(JSON.parse(request.responseText)));
