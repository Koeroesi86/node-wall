import { AddPostTagRequestSchema, CreateTagRequestSchema, TagListResponseSchema, TagResponseSchema } from '../../lib/api-schemas';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { request } from '../api.ts';
import { TranslateText, useTranslate } from '../translations.tsx';
import './post-tags-input.css';

export interface PostTagsInputHandle {
  readonly tagIds: string[];
  /** Shows a tag as chosen, saving it to the post unless `assign` is off. */
  add: (tagId: string, assign?: boolean) => Promise<void>;
  createTag: (name: string, type?: string) => Promise<void>;
}

interface PostTagsInputProps {
  postId: string;
  ref?: Ref<PostTagsInputHandle>;
}

interface Tag {
  id: string;
  name: string;
}

const retryDelay = 300;
const searchDelay = 200;

const wait = (delay: number) => new Promise(resolve => setTimeout(resolve, delay));

export const PostTagsInput = ({ postId, ref }: PostTagsInputProps) => {
  const translate = useTranslate();
  const [tags, setTags] = useState<Tag[]>([]);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Tag[]>([]);
  // the typed name, offered as a new tag when the search did not find it
  const [suggestion, setSuggestion] = useState<string>();
  const [focused, setFocused] = useState(false);
  const current = useRef<Tag[]>([]);
  const adding = useRef(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const assignTag = (tagId: string) => request('POST', `/api/posts/${postId}/tags`, AddPostTagRequestSchema.parse({ id: tagId })).catch(() => undefined);

  const getTag = (id: string) => request('GET', `/api/tags/${id}`).then(tag => TagResponseSchema.parse(tag));

  const add = async (tagId: string, assign = true): Promise<void> => {
    if (adding.current) {
      await wait(retryDelay);
      return add(tagId, assign);
    }
    if (current.current.some(tag => tag.id === tagId)) return;

    adding.current = true;
    try {
      if (assign) await assignTag(tagId);
      const tag = await getTag(tagId);
      current.current = [...current.current, tag];
      setTags(current.current);
      adding.current = false;
    } catch {
      adding.current = false;
      await wait(retryDelay);
      return add(tagId, assign);
    }
  };

  const remove = async (tagId: string) => {
    await request('DELETE', `/api/posts/${postId}/tags/${tagId}`);
    current.current = current.current.filter(tag => tag.id !== tagId);
    setTags(current.current);
  };

  const createTag = async (name: string, type = 'text') => {
    const tag = TagResponseSchema.parse(await request('POST', '/api/tags', CreateTagRequestSchema.parse({ name, type })));

    await add(tag.id, true);
  };

  const search = async (text: string): Promise<void> => {
    try {
      const found = TagListResponseSchema.parse(await request('GET', `/api/tags?s=${text}`)) as Tag[];
      setResults(found.filter(tag => !current.current.some(chosen => chosen.id === tag.id)));
      setSuggestion(found.some(tag => tag.name === text) ? undefined : text);
    } catch {
      await wait(retryDelay);
      return search(text);
    }
  };

  useImperativeHandle(ref, () => ({
    get tagIds() {
      return current.current.map(tag => tag.id);
    },
    add,
    createTag,
  }));

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  return (
    <div
      className={focused ? 'post-tags-input focused' : 'post-tags-input'}
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div className="tags">
        {tags.map(tag => (
          <div className="tagElement" key={tag.id}>
            <div className="label">{tag.name}</div>
            <div className="remove" title={translate('post-tags-input.remove-tag.title')} onClick={() => remove(tag.id).catch(console.error)}>
              <svg className="icon" enableBackground="new 0 0 100 100" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <polygon points="77.6,21.1 49.6,49.2 21.5,21.1 19.6,23 47.6,51.1 19.6,79.2 21.5,81.1 49.6,53 77.6,81.1 79.6,79.2   51.5,51.1 79.6,23 " />
              </svg>
            </div>
          </div>
        ))}
        <input
          className="input"
          value={term}
          onChange={(event) => {
            const text = event.target.value;
            setTerm(text);
            clearTimeout(searchTimer.current);
            if (!text) {
              setResults([]);
              setSuggestion(undefined);
              return;
            }
            searchTimer.current = setTimeout(() => search(text), searchDelay);
          }}
        />
        <div className="results">
          {results.map(tag => (
            <div
              className="tagResult"
              key={tag.id}
              onClick={() => {
                setResults(list => list.filter(item => item.id !== tag.id));
                add(tag.id);
              }}
            >{tag.name}</div>
          ))}
          {suggestion && (
            <div className="tagResult" onClick={() => createTag(suggestion, 'text').then(() => setSuggestion(undefined)).catch(console.error)}>
              {`"${suggestion}" `}<TranslateText alias="post-tags-input.create-tag" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
