import { v4 as uuid } from 'uuid';
import storage from '../storage';
import getPost from './queries/getPost';
import getPostTags from './queries/getTags';
import getPostComments from './queries/getComments';
import createPostComment from './queries/createComment';
import setStatus from './queries/setStatus';
import getBounds from './queries/getBounds';
import getList from './queries/getList';
import getNextPage from './queries/getNextPage';
import create from './queries/create';
import addTag from './queries/addTag';
import removeTag from './queries/removeTag';

export default {
  create: async (body: string, owner: string | null, type = 'post') => {
    const id = uuid();

    let content = body;
    content = content.trim();
    content = content.replace(/\n{3,}/gi, '\n\n');
    content = content.replace(/&nbsp;/gi, ' ');
    content = content.replace(/<[^>]*>/g, ''); //strip html

    await storage.write(id, type, content);
    await create(id, owner);
  },
  get: async (postId: string) => {
    return getPost(postId);
  },
  getTags: async (postId: string) => {
    return getPostTags(postId);
  },
  getComments: async (postId: string, status = 'public') => {
    return getPostComments(postId, status = 'public');
  },
  createComment: async (postId: string, parent: string | undefined, owner: string | null, body: string) => {
    const id = uuid();
    let content = body;

    content = content.trim();
    content = content.replace(/\n{3,}/gi, '\n\n');
    content = content.replace(/&nbsp;/gi, ' ');
    content = content.replace(/<[^>]*>/g, ''); //strip html

    await storage.write(id, 'comment', content);

    await createPostComment(id, postId, parent, owner);
  },
  setStatus: async (id: string, status: string) => setStatus(id, status),
  getContent: async (id: string, type = 'post') => storage.read(id, type),
  getBounds: async () => {
    return await getBounds() || { oldest: null, newest: null };
  },
  getList: async (status: string, before: string | undefined, since: string | undefined, likedTags: string[], dislikedTags: string[]) => {
    return getList(status, before, since, likedTags, dislikedTags);
  },
  getNextPage: async (status: string, before: string | undefined, since: string | undefined, likedTags: string[], dislikedTags: string[]) => {
    return getNextPage(status, before, since, likedTags, dislikedTags);
  },
  addTag: async (postId: string, tagId: string) => addTag(postId, tagId),
  removeTag: async (postId: string, tagId: string) => removeTag(postId, tagId),
};
