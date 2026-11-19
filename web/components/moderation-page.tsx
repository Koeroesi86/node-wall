import { useEffect, useRef, useState } from 'react';
import { request } from '../api.ts';
import { TranslateText, useTranslate } from '../translations.tsx';
import { PostPreview } from './post-preview.tsx';
import { PostTagsInput, type PostTagsInputHandle } from './post-tags-input.tsx';
import './moderation-page.css';

interface PendingPostData {
  id: string;
  created_at: number | string;
}

interface PostDetails {
  content: string;
  tags: { id: string; name: string }[];
}

const pollDelay = 5 * 1000;
const hashtag = /#[a-zÀ-ſ0-9]+/gi;
const word = /[a-zÀ-ſ0-9]+/gi;

const setStatus = (postId: string, status: string) => request('PUT', `/api/posts/${postId}`, ApiSchemas.SetPostStatusRequestSchema.parse({ status }))
  .then(() => location.reload())
  .catch(console.error);

const PendingPost = ({ post }: { post: PendingPostData }) => {
  const translate = useTranslate();
  const tagsInput = useRef<PostTagsInputHandle>(null);
  const [newTags, setNewTags] = useState<string[]>([]);

  useEffect(() => {
    request('GET', `/api/posts/${post.id}`)
      .then(details => ApiSchemas.PostResponseSchema.parse(details) as PostDetails)
      .then((details) => {
        details.tags.forEach(tag => tagsInput.current?.add(tag.id, false));
        setNewTags([...details.content.matchAll(hashtag)]
          .map(match => match[0])
          .filter(text => !details.tags.some(tag => `#${tag.name}` === text)));
      })
      .catch(console.error);
  }, [post.id]);

  const approve = () => {
    if (tagsInput.current?.tagIds.length === 0) {
      alert(translate('moderation-page.posts.no-tags-alert'));
      return;
    }

    setStatus(post.id, 'public');
  };

  return (
    <div className="postModerationWrapper" post-id={post.id}>
      <PostPreview postId={post.id} />
      <div className="newTags" hidden={newTags.length === 0}>
        <div className="newTagsNote">
          <TranslateText alias="moderation-page.posts.new-tags-note" />
        </div>
        <div className="newTagsList">
          {newTags.map(tag => (
            <div className="newTagsItem" key={tag}>
              <div className="label">{tag}</div>
              <div
                className="add"
                title={translate('moderation-page.posts.create-tag-title')}
                onClick={() => tagsInput.current?.createTag(tag.match(word)?.[0] ?? '', 'text')
                  .then(() => setNewTags(tags => tags.filter(item => item !== tag)))
                  .catch(console.error)}
              >
                <svg className="icon" enableBackground="new 0 0 100 100" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="80.2,51.6 51.4,51.6 51.4,22.6 48.9,22.6 48.9,51.6 19.9,51.6 19.9,54.1 48.9,54.1 48.9,83.1   51.4,83.1 51.4,54.1 80.4,54.1 80.4,51.6 " />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="addTags">
        <div className="addTagsHeading">
          <TranslateText alias="moderation-page.posts.add-tags-heading" />
        </div>
        <PostTagsInput postId={post.id} ref={tagsInput} />
      </div>
      <div className="buttonsWrapper">
        <button type="button" className="button approve" onClick={approve}>
          <TranslateText alias="moderation-page.posts.approve" />
        </button>
        <button type="button" className="button disapprove" onClick={() => setStatus(post.id, 'moderated')}>
          <TranslateText alias="moderation-page.posts.disapprove" />
        </button>
      </div>
    </div>
  );
};

export const ModerationPage = () => {
  const [posts, setPosts] = useState<PendingPostData[]>();
  const notification = useRef<HTMLAudioElement>(null);
  const latest = useRef<number | string | null>(null);
  const initialised = useRef(false);
  const known = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let stopped = false;

    const poll = () => request('GET', `/api/posts?status=pending${latest.current ? `&since=${Number(latest.current) + 1}` : ''}`)
      .then(list => ApiSchemas.PostListResponseSchema.parse(list) as PendingPostData[])
      .then((fetched) => {
        if (stopped) return;
        const added = fetched.filter(post => !known.current.has(post.id));

        added.forEach((post) => {
          known.current.add(post.id);
          if ((latest.current ?? 0) < post.created_at) latest.current = post.created_at;
        });
        setPosts(current => [...(current ?? []), ...added]);
        if (initialised.current && added.length > 0) notification.current?.play();
        initialised.current = true;
        timer.current = setTimeout(poll, pollDelay);
      })
      .catch(console.error);

    poll();

    return () => {
      stopped = true;
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="moderation-page">
      <audio src="/static/media/notification.mp3" className="notification" ref={notification}></audio>
      <div>
        <h3>
          <TranslateText alias="moderation-page.header" />
        </h3>
        <div>
          <div className="heading">
            <TranslateText alias="moderation-page.posts.header" />
          </div>
          <div className="pendingPosts">
            <div className={posts ? 'loading hidden' : 'loading'}>
              <TranslateText alias="moderation-page.posts.loading" />
            </div>
            {posts?.length === 0 && (
              <div className="noPostsMessage">
                <TranslateText alias="moderation-page.posts.no-posts" />
              </div>
            )}
            {posts?.map(post => <PendingPost post={post} key={post.id} />)}
          </div>
        </div>
      </div>
    </div>
  );
};
