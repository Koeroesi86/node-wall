import type { LambdaCallback, LambdaEvent } from '../../lib/types';
import { parseCookies, buildSessionCookie } from '../../lib/utils/sessionCookie';
import crypto from 'crypto';
import moment from 'moment';
import matchAll from 'match-all';
import storageService from '../../lib/services/storage';
import postService from '../../lib/services/post';
import commentService from '../../lib/services/comment';
import sessionService from '../../lib/services/session';
import linkService from '../../lib/services/link';
import tagService from '../../lib/services/tag';
import userService from '../../lib/services/user';
import accountService from '../../lib/services/account';
import auditService from '../../lib/services/audit';
import confirmDeletionTemplate from '../../lib/templates/email/confirmDeletion';
import getUserInfoFromSession from '../../lib/utils/getUserInfoFromSession';
import readJson from '../../lib/utils/readJson';
import getUserSessions from '../../lib/utils/getUserSessions';
import generateCode from '../../lib/utils/generateCode';
import normalizeLogin from '../../lib/utils/normalizeLogin';
import { hashLoginCode } from '../../lib/utils/loginCode';
import verifyLoginTemplate from '../../lib/templates/email/verifyLogin';
import createMailer from '../../lib/utils/createMailer';
import getTranslation from '../../lib/translations/getTranslation';
import detectLanguage from '../../lib/utils/detectLanguage';
import isAdmin from '../../lib/utils/isAdmin';
import type { ZodType } from 'zod';
import {
  AddPostTagRequestSchema, AuditListResponseSchema, BoundsResponseSchema, CommentResponseSchema, CreateCommentRequestSchema, CreatePostRequestSchema,
  CreateTagRequestSchema, DeleteAccountRequestSchema, EmptyResponseSchema, LinkResponseSchema, LoginRequestSchema, LoginResponseSchema, PostListResponseSchema, PostResponseSchema,
  RemoveUserTagRequestSchema, SessionListResponseSchema, SetPostStatusRequestSchema, SetUserNameRequestSchema,
  SetUserRoleRequestSchema, SetUserTagRequestSchema, TagListResponseSchema, TagResponseSchema, UserInfoResponseSchema,
  UserListResponseSchema, UserTagListResponseSchema,
} from '../../lib/api-schemas';
import rateLimitService from '../../lib/services/rate-limit';
import createRateLimiter from '../../lib/utils/createRateLimiter';
import getClientIp from '../../lib/utils/getClientIp';
import formatError from '../../lib/utils/formatError';
import assertSafeLoginLogging from '../../lib/utils/assertSafeLoginLogging';

assertSafeLoginLogging(process.env);

const hour = 60 * 60 * 1000;
// Deliberately very low for now; raise once real usage is known.
const loginIpLimiter = createRateLimiter({ name: 'login-ip', limit: 3, windowMs: hour });
const loginAddressLimiter = createRateLimiter({ name: 'login-address', limit: 2, windowMs: hour });
const contentLimiter = createRateLimiter({ name: 'content', limit: 3, windowMs: hour });
const deletionLimiter = createRateLimiter({ name: 'account-deletion', limit: 3, windowMs: hour });
const tooManyRequests = () => ({
  statusCode: 429,
  headers: getResponseHeaders({ 'Retry-After': String(hour / 1000) }),
  body: JSON.stringify({ message: 'Too many requests.' }),
  isBase64Encoded: false,
});

const keepAliveTimeout = 30 * 1000;
const keepAliveCallback = () => {
  console.log('Shutting down API due to inactivity.');
  process.exit(0);
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);
const getResponseHeaders = (headers = {}) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, PUT, GET, DELETE, OPTIONS',
  'Cache-Control': 'private, no-store',
  ...headers,
});
const transporter = createMailer();

/** Serializes a 200 response, throwing (so the client gets a 400) instead of sending data that does not match its schema. */
const jsonResponse = <Schema extends ZodType>(schema: Schema, data: unknown, headers = {}) => ({
  statusCode: 200,
  headers: getResponseHeaders(headers),
  body: JSON.stringify(schema.parse(data), null, 2),
  isBase64Encoded: false,
});

export = async (event: LambdaEvent, callback: LambdaCallback) => {
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

  try {
    const httpMethod = (event.httpMethod || '').toUpperCase();
    const {
      queryStringParameters,
      pathFragments,
      headers,
    } = event;
    const clientIp = getClientIp(event);
    const requestId = crypto.randomUUID();
    const cookiesRaw = headers.Cookie || headers.cookie || '';
    const cookies = parseCookies(cookiesRaw);
    let userInfo = null;

    if (cookies.sessionId) {
      userInfo = await getUserInfoFromSession(cookies.sessionId);
      if (userInfo) {
        await sessionService.setDetails(cookies.sessionId, headers['user-agent'], clientIp);
        await sessionService.setLastActive(cookies.sessionId, Date.now());
      }
    }

    /** @route /api/link */
    if (pathFragments[1] === 'link') {
      if (httpMethod === 'GET') {
        if (!queryStringParameters) throw new Error('no queryStringParameters');
        const { uri, post } = queryStringParameters;
        if (!uri) throw new Error('No uri specified');
        if (!post) throw new Error('No post specified');
        if (!/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(post)) throw new Error('Invalid post id');

        const postContent = await storageService.read(post, 'post');
        const toHttps = (link: string) => link.replace(/^http:/, 'https:');
        const url = (postContent || '')
          .match(/https?:\/\/[^\s<>"']+/gi)
          ?.map(toHttps)
          .find(link => link === toHttps(uri));
        if (!url) throw new Error('Uri not present in post.');

        const existingLink = await linkService.getByUrl(url);

        if (existingLink) {
          const linkData = await linkService.getData(existingLink.id);

          if (linkData) {
            return callback(jsonResponse(LinkResponseSchema, JSON.parse(linkData)));
          }
        }

        const postRecord = await postService.get(post);
        if (postRecord && postRecord.status === 'public') {
          return callback(jsonResponse(LinkResponseSchema, await linkService.create(url)));
        }

        return callback({
          statusCode: 400,
          headers: getResponseHeaders(),
          body: JSON.stringify({}, null, 2),
          isBase64Encoded: false,
        });
      }
    }

    /** @route /api/comment */
    if (pathFragments[1] === 'comment') {
      if (httpMethod === 'POST' && pathFragments.length === 2) {
        const payload = await readJson(event.bodyStream, CreateCommentRequestSchema);
        const owner = userInfo ? userInfo.user.id : null;

        const post = await postService.get(payload.postId);
        if (post?.status !== 'public') throw new Error('post not found');

        if (payload.parent) {
          const parent = await commentService.get(payload.parent);
          if (parent.post !== payload.postId) throw new Error('parent comment belongs to another post');
        }

        if (!await contentLimiter.consume(owner ?? `ip:${clientIp}`)) {
          return callback(tooManyRequests());
        }

        await postService.createComment(payload.postId, payload.parent, owner, payload.body);

        return callback(jsonResponse(EmptyResponseSchema, {}));
      }

      if (httpMethod === 'GET' && pathFragments[2] && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
        const id = pathFragments[2];
        const comment = await commentService.get(id);

        return callback(jsonResponse(CommentResponseSchema, comment));
      }
    }

    /** @route /api/posts */
    if (pathFragments[1] === 'posts') {
      if (httpMethod === 'OPTIONS') {
        return callback({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: '',
          isBase64Encoded: false,
        });
      }

      if (httpMethod === 'PUT' && pathFragments[2] && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
        const id = pathFragments[2];
        if (isAdmin(userInfo)) {
          const payload = await readJson(event.bodyStream, SetPostStatusRequestSchema);

          if (payload.status === 'public') {
            let content = await storageService.read(id, 'post');
            const tagMatches = matchAll(content, /#([a-z\u00C0-\u017F0-9]+)/gi).toArray();
            for (let i = 0; i < tagMatches.length; i++) {
              const tagRaw = tagMatches[i];
              const existingTag = await tagService.getByName(tagRaw);
              if (existingTag) {
                tagMatches.splice(i, 1);
                content = content.replace(`#${tagRaw}`, `#!${existingTag.id}`);
              }
            }
            const newTags = await Promise.all(
              tagMatches.map(text => tagService.create(text, 'text'))
            );

            newTags.forEach(tag => {
              content = content.replace(`#${tag.name}`, `#!${tag.id}`);
            });

            await storageService.write(id, 'post', content);
          }

          await postService.setStatus(id, payload.status);
          await auditService.record(userInfo.user.id, `post.status.${payload.status}`, id, requestId);

          return callback({
            statusCode: 201,
            headers: getResponseHeaders(),
            body: '',
            isBase64Encoded: false,
          });
        }

        return callback({
          statusCode: 401,
          headers: getResponseHeaders(),
          body: '',
          isBase64Encoded: false,
        });
      }

      if (httpMethod === 'GET') {
        if (/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
          const postId = pathFragments[2];
          const post = await postService.get(postId);

          if (!post) {
            return callback({
              statusCode: 404,
              headers: getResponseHeaders(),
              body: JSON.stringify({}, null, 2),
              isBase64Encoded: false,
            });
          }

          if (post.status !== 'public' && !isAdmin(userInfo)) {
            return callback({
              statusCode: 401,
              headers: getResponseHeaders(),
              body: JSON.stringify({}, null, 2),
              isBase64Encoded: false,
            });
          }

          const postTags = await postService.getTags(postId);

          if (pathFragments.length === 3) {
            return callback(jsonResponse(PostResponseSchema, {
              id: post.id,
              type: post.type,
              content: await postService.getContent(post.id, post.type ?? undefined),
              created_at: post.created_at,
              comments: (await postService.getComments(postId)).map(c => c.id),
              owner: (post.owner && await userService.get(post.owner)) || null,
              tags: postTags
            }));
          }

          if (pathFragments.length === 4) {
            if (pathFragments[3] === 'tags') {
              return callback(jsonResponse(TagListResponseSchema, postTags));
            }
          }
        }

        if (pathFragments[2] === 'bounds') {
          return callback(jsonResponse(BoundsResponseSchema, await postService.getBounds()));
        }

        if (pathFragments.length === 2) {
          let status = 'public';
          let nextPageBefore = null;
          const requestedStatus = queryStringParameters?.status;
          if (
            isAdmin(userInfo)
            && requestedStatus
            && ['public', 'pending', 'moderated', 'deleted'].includes(requestedStatus)
          ) {
            status = requestedStatus;
          }

          let before: string | undefined;
          let since: string | undefined;
          let likedTags: string[] = [];
          let dislikedTags: string[] = [];

          if (event.queryStringParameters) {
            if (event.queryStringParameters.before) {
              before = event.queryStringParameters.before;
            }

            if (event.queryStringParameters.since) {
              since = event.queryStringParameters.since;
            }

            if (event.queryStringParameters.likedTags) {
              likedTags = event.queryStringParameters.likedTags.split(',');
            }

            if (event.queryStringParameters.dislikedTags) {
              dislikedTags = event.queryStringParameters.dislikedTags.split(',');
            }

            const nextPageBeforeResult = await postService.getNextPage(status, before, since, likedTags, dislikedTags);
            if (nextPageBeforeResult)  {
              nextPageBefore = nextPageBeforeResult.nextPageBefore;
            }
          }

          const posts = await postService.getList(status, before, since, likedTags, dislikedTags);

          return callback(jsonResponse(PostListResponseSchema, posts, {
            ...(nextPageBefore && { 'x-next-page-before': nextPageBefore })
          }));
        }
      }

      if (httpMethod === 'POST') {
        if (pathFragments.length === 2) {
          const payload = await readJson(event.bodyStream, CreatePostRequestSchema);

          if (!await contentLimiter.consume(userInfo?.user.id ?? `ip:${clientIp}`)) {
            return callback(tooManyRequests());
          }

          await postService.create(payload.content, userInfo ? userInfo.user.id : null)

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: '',
            isBase64Encoded: false,
          });
        }

        if (/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
          if (!isAdmin(userInfo)) {
            return callback({
              statusCode: 401,
              headers: getResponseHeaders(),
              body: '',
              isBase64Encoded: false,
            })
          }
          const postId = pathFragments[2];
          const postTags = await postService.getTags(postId);

          if (pathFragments[3] === 'tags') {
            const payload = await readJson(event.bodyStream, AddPostTagRequestSchema);

            const tagId = payload.id;
            if (!await postService.get(postId)) throw new Error('post not found');
            if (!await tagService.get(tagId)) throw new Error('tag not found');
            if (postTags.find(tag => tag.id === tagId)) {
              return callback({
                statusCode: 400,
                headers: getResponseHeaders(),
                body: '',
                isBase64Encoded: false,
              });
            }

            await postService.addTag(postId, tagId);
            await auditService.record(userInfo.user.id, 'post.tag-added', postId, requestId);

            return callback({
              statusCode: 200,
              headers: getResponseHeaders(),
              body: '',
              isBase64Encoded: false,
            });
          }
        }
      }

      if (httpMethod === 'DELETE') {
        if (/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
          const postId = pathFragments[2];
          const postTags = await postService.getTags(postId);

          if (pathFragments[3] === 'tags') {
            if (!isAdmin(userInfo)) {
              return callback({
                statusCode: 401,
                headers: getResponseHeaders(),
                body: '',
                isBase64Encoded: false,
              })
            }
            if (/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[4])) {
              const tagId = pathFragments[4];
              if (!postTags.find(tag => tag.id === tagId)) throw new Error('tag not assigned to post');

              await postService.removeTag(postId, tagId);
              await auditService.record(userInfo.user.id, 'post.tag-removed', postId, requestId);

              return callback({
                statusCode: 200,
                headers: getResponseHeaders(),
                body: '',
                isBase64Encoded: false,
              });
            }
          }
        }
      }
    }

    /** @route /api/tags */
    if (pathFragments[1] === 'tags') {
      if (httpMethod === 'OPTIONS') {
        return callback({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: '',
          isBase64Encoded: false,
        });
      }

      if (httpMethod === 'GET') {
        if (pathFragments.length === 3 && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
          const tag = await tagService.get(pathFragments[2]);

          if (!tag) {
            return callback({
              statusCode: 404,
              headers: getResponseHeaders(),
              body: JSON.stringify({}, null, 2),
              isBase64Encoded: false,
            });
          }

          return callback(jsonResponse(TagResponseSchema, tag));
        }

        if (pathFragments.length === 2) {
          let search = '';
          let exact = false;

          if (queryStringParameters) {
            search = queryStringParameters.s || '';
            exact = !!queryStringParameters.exact;
          }

          return callback(jsonResponse(TagListResponseSchema, await tagService.getList(search, exact)));
        }
      }

      if (httpMethod === 'POST') {
        if (pathFragments.length === 2) {
          if (!userInfo) throw new Error('Not logged in');
          if (!isAdmin(userInfo)) throw new Error('Not authorized');

          const payload = await readJson(event.bodyStream, CreateTagRequestSchema);
          const tag = await tagService.create(payload.name, payload.type);
          await auditService.record(userInfo.user.id, 'tag.created', tag.id, requestId);

          return callback(jsonResponse(TagResponseSchema, tag));
        }
      }
    }

    /** @route /api/users */
    if (pathFragments[1] === 'users') {
      if (!userInfo) throw new Error('Not logged in');
      if (!isAdmin(userInfo)) throw new Error('Not authorized');

      if (httpMethod === 'GET' && pathFragments.length === 2) {
        return callback(jsonResponse(UserListResponseSchema, await userService.getList()));
      }

      /** @route /api/users/audit */
      if (httpMethod === 'GET' && pathFragments.length === 3 && pathFragments[2] === 'audit') {
        return callback(jsonResponse(AuditListResponseSchema, await auditService.getRecent()));
      }

      if (httpMethod === 'PUT' && pathFragments.length === 3) {
        const { role } = await readJson(event.bodyStream, SetUserRoleRequestSchema);
        const [, , targetId = ''] = pathFragments;
        if (targetId === userInfo.user.id) throw new Error('cannot change own role');

        await userService.setRole(targetId, role);
        await auditService.record(userInfo.user.id, `user.role.${role}`, targetId, requestId);

        return callback({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: '',
          isBase64Encoded: false,
        });
      }
    }

    /** @route /api/user */
    if (pathFragments[1] === 'user') {
      if (pathFragments.length === 2) {
        if (httpMethod === 'POST') {
          const payload = await readJson(event.bodyStream, LoginRequestSchema);

          await rateLimitService.removeExpired();
          await sessionService.cleanup();
          await auditService.cleanup();

          if (!await loginIpLimiter.consume(`ip:${clientIp}`)) {
            return callback(tooManyRequests());
          }

          // Cap the emails sent per address without refusing the login, so nobody can lock a victim out.
          // The response looks the same either way.
          if (!await loginAddressLimiter.consume(`${payload.type}:${normalizeLogin(payload.type, payload.value)}`)) {
            return callback(jsonResponse(LoginResponseSchema, { sessionId: crypto.randomUUID() }));
          }

          let login;

          try {
            const currentLogin = await userService.getLogin(payload.type, payload.value);

            if (!currentLogin) {
              throw new Error('no login yet');
            }

            login = currentLogin
          } catch (e) {
            const user = await userService.create(payload.name);
            login = await userService.addLogin(user.id, payload.value, payload.type);
          }

          const session = {
            id: crypto.randomUUID(),
            users_login_id: login.id,
            status: 'pending',
            secret: generateCode(),
          };
          await sessionService.create(session.id, login.id, hashLoginCode(session.secret), 'pending');

          if (payload.type === 'email') {
            const verifyUrl = new URL(`${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/login/email`);
            verifyUrl.searchParams.set('code', session.secret);
            verifyUrl.searchParams.set('session', session.id);
            if (process.env.LOG_LOGIN_CODE === 'true') {
              console.log('login url (dev only)', verifyUrl.toString()); // assertSafeLoginLogging forbids this on https
              return callback(jsonResponse(LoginResponseSchema, { sessionId: session.id }));
            }
            const activateUrl = new URL(`${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/login`);
            activateUrl.searchParams.set('session', session.id);
            const { value: title } = await getTranslation('email.verify.title', await detectLanguage(headers));
            transporter.sendMail({
              from: process.env.NODEMAILER_USER || 'sender@example.com',
              to: normalizeLogin(payload.type, payload.value),
              subject: title,
              encoding: 'utf-8',
              html: await verifyLoginTemplate({
                language: await detectLanguage(headers),
                title,
                code: session.secret,
                activateUrl: activateUrl.toString(),
                verifyUrl: verifyUrl.toString(),
              }),
            }, (err) => {
              if (err) {
                console.error('mail error', formatError(err));
                return callback({
                  statusCode: 400,
                  headers: getResponseHeaders({}),
                  body: '',
                  isBase64Encoded: false,
                });
              }

              console.log('login mail sent for session', session.id);
              return callback(jsonResponse(LoginResponseSchema, { sessionId: session.id }));
            });
            return;
          }
        }

        if (httpMethod === 'DELETE') {
          if (!userInfo) throw new Error('not logged in');
          const { code } = await readJson(event.bodyStream, DeleteAccountRequestSchema);

          if (!await accountService.confirmDeletion(userInfo.user.id, code)) throw new Error('invalid confirmation code');

          const expires = moment().subtract(1, 'year');
          return callback(jsonResponse(EmptyResponseSchema, {}, {
            'Set-Cookie': buildSessionCookie('none', expires.format('ddd, DD MMM YYYY HH:mm:ss')),
          }));
        }

        if (httpMethod === 'GET') {
          /** @route /api/user */
          if (pathFragments.length === 2) {
            if (!userInfo) {
              const expires = moment().subtract(1, 'year');
              return callback({
                statusCode: 401,
                headers: {
                  'Content-Type': 'text/html',
                  'Cache-Control': 'public, max-age=0',
                  'Set-Cookie': buildSessionCookie('none', expires.format('ddd, DD MMM YYYY HH:mm:ss')),
                },
                body: '',
                isBase64Encoded: false,
              });
            }

            return callback(jsonResponse(UserInfoResponseSchema, userInfo));
          }
        }
      }

      /** @route /api/user/deletion Emails a code that confirms the account deletion. */
      if (pathFragments[2] === 'deletion' && pathFragments.length === 3 && httpMethod === 'POST') {
        if (!userInfo) throw new Error('not logged in');
        if (!await deletionLimiter.consume(userInfo.user.id)) return callback(tooManyRequests());

        const code = await accountService.requestDeletion(userInfo.user.id);

        if (process.env.LOG_LOGIN_CODE === 'true') {
          console.log('account deletion code (dev only)', code); // assertSafeLoginLogging forbids this on https
          return callback(jsonResponse(EmptyResponseSchema, {}));
        }

        const language = await detectLanguage(headers);
        const { value: title } = await getTranslation('email.delete.title', language);
        await transporter.sendMail({
          from: process.env.NODEMAILER_USER || 'sender@example.com',
          to: normalizeLogin(userInfo.login.type, userInfo.login.value),
          subject: title,
          encoding: 'utf-8',
          html: await confirmDeletionTemplate({ language, title, code }),
        });

        return callback(jsonResponse(EmptyResponseSchema, {}));
      }

      /** @route /api/user/export */
      if (pathFragments[2] === 'export' && pathFragments.length === 3 && httpMethod === 'GET') {
        if (!userInfo) throw new Error('not logged in');

        return callback({
          statusCode: 200,
          headers: getResponseHeaders({ 'Content-Disposition': 'attachment; filename="my-data.json"' }),
          body: JSON.stringify(await accountService.export(userInfo.user.id), null, 2),
          isBase64Encoded: false,
        });
      }

      /** @route /api/user/sessions */
      if (pathFragments[2] === 'sessions' && userInfo) {
        if (pathFragments.length === 3 && httpMethod === 'GET') {
          const userSessions = await getUserSessions(userInfo.user.id);
          if (!userSessions) throw new Error('no sessions');

          const sessions = userSessions
            .filter(session => session.sessionStatus !== 'deleted')
            .map(({ userAgent, remoteAddress, ...session }) => ({
              ...session,
              sessionCreatedAt: new Date(session.sessionCreatedAt).valueOf(),
              details: userAgent || remoteAddress ? { userAgent, remoteAddress } : null,
            }));
          return callback(jsonResponse(SessionListResponseSchema, sessions));
        }

        if (/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[3]) && httpMethod === 'DELETE') {
          const sessions = await getUserSessions(userInfo.user.id);
          if (!sessions) throw new Error('no sessions');

          if (sessions.find(session => session.sessionId === pathFragments[3])) {
            await sessionService.remove(pathFragments[3]);

            return callback({
              statusCode: 200,
              headers: getResponseHeaders(),
              body: '',
              isBase64Encoded: false,
            });
          }
        }
      }

      /** @route /api/user/name */
      if (pathFragments[2] === 'name') {
        if (httpMethod === 'GET') {
          if (!userInfo) throw new Error('not logged in');

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify({ name: userInfo.user.name }, null, 2),
            isBase64Encoded: false,
          });
        }

        if (httpMethod === 'PUT') {
          if (!userInfo) throw new Error('not logged in');
          const payload = await readJson(event.bodyStream, SetUserNameRequestSchema);

          await userService.setName(userInfo.user.id, payload.name);

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: '',
            isBase64Encoded: false,
          });
        }
      }

      /** @route /api/user/tags */
      if (pathFragments[2] === 'tags') {
        if (httpMethod === 'GET') {
          if (!userInfo) {
            return callback({
              statusCode: 401,
              headers: getResponseHeaders(),
              body: JSON.stringify([], null, 2),
              isBase64Encoded: false,
            });
          }

          return callback(jsonResponse(UserTagListResponseSchema, await userService.getTags(userInfo.user.id)));
        }

        if (httpMethod === 'PUT') {
          if (!userInfo) throw new Error('not logged in');
          const payload = await readJson(event.bodyStream, SetUserTagRequestSchema);
          if (!await tagService.get(payload.id)) throw new Error('tag not found');

          await userService.addTag(payload.id, userInfo.user.id, payload.type);

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: '',
            isBase64Encoded: false,
          });
        }

        if (httpMethod === 'DELETE') {
          if (!userInfo) throw new Error('not logged in');
          const payload = await readJson(event.bodyStream, RemoveUserTagRequestSchema);

          await userService.removeTag(payload.id, userInfo.user.id);

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: '',
            isBase64Encoded: false,
          });
        }
      }
    }

    callback({
      statusCode: 404,
      headers: getResponseHeaders(),
      body: '',
      isBase64Encoded: false,
    });
  } catch (e) {
    console.error(formatError(e));
    callback({
      statusCode: 400,
      headers: getResponseHeaders(),
      body: JSON.stringify({ message: `Something isn't quite right.` }),
      isBase64Encoded: false,
    });
  }
};
