import { RemoveUserTagRequestSchema, SetUserTagRequestSchema } from '../../lib/api-schemas';
import { userActions } from '../store/user.ts';
import { tagsActions } from '../store/tags.ts';
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { useRedux } from '../use-redux.ts';
import { TranslateText } from '../translations.tsx';
import { XIcon } from './x-icon.tsx';
import './tag-inline.css';

interface TagInlineProps {
  tagId: string;
}

interface UserTag {
  tag_id: string;
  type: string;
}

const hideDelay = 200;

const send = (method: string, body: unknown) => new Promise<void>((resolve, reject) => {
  const request = new XMLHttpRequest();
  request.onreadystatechange = () => {
    if (request.readyState !== 4) return;
    if (request.status === 200) resolve();
    else reject(request);
  };
  request.open(method, '/api/user/tags', true);
  request.setRequestHeader('Content-Type', 'application/json');
  request.send(JSON.stringify(body));
});

const addTag = (id: string, type: string) => !id
  ? Promise.reject(new Error('Tag id is required'))
  : !['liked', 'disliked'].includes(type)
    ? Promise.reject(new Error('Invalid type'))
    : send('PUT', SetUserTagRequestSchema.parse({ id, type }));

const removeTag = (id: string) => !id
  ? Promise.reject(new Error('Tag id is required'))
  : send('DELETE', RemoveUserTagRequestSchema.parse({ id }));

const isInside = (parent: HTMLElement | null, node: EventTarget | null): boolean => node instanceof Node && !!parent?.contains(node);

export const TagInline = ({ tagId }: TagInlineProps) => {
  const { state, dispatch } = useRedux();
  const root = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [tooltip, setTooltip] = useState<CSSProperties & { visible?: boolean }>();
  const tag = state?.tags[tagId];
  const role: string = state?.user.role ?? 'guest';
  const current: UserTag | undefined = ((state?.user.tags as UserTag[] | null) ?? []).find(userTag => userTag.tag_id === tag?.id);

  useEffect(() => {
    dispatch(tagsActions.request(tagId));
    dispatch(userActions.requestTags());
  }, [dispatch, tagId]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const choose = (type: string) => (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!tag) return;

    Promise.resolve()
      .then(() => current?.type === type ? removeTag(tag.id) : addTag(tag.id, type))
      .then(() => dispatch(userActions.requestTags()))
      .catch(console.error);
  };

  const show = () => {
    clearTimeout(hideTimer.current);
    const rect = root.current?.getBoundingClientRect();
    if (!rect) return;

    setTooltip({
      visible: true,
      ...(window.innerHeight / 2 > rect.y ? { top: Math.ceil(rect.y + rect.height) } : { bottom: Math.ceil(window.innerHeight - rect.y) }),
      ...(window.innerWidth / 2 > rect.x ? { left: Math.ceil(rect.x) } : { right: Math.ceil(window.innerWidth - rect.x - rect.width) }),
    });
  };

  const hide = (event: MouseEvent) => {
    if (isInside(root.current, event.relatedTarget)) return;

    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setTooltip(undefined), hideDelay);
  };

  const { visible, ...position } = tooltip ?? {};

  return (
    <span className="tag-inline" ref={root} onMouseOver={show} onMouseLeave={hide}>
      <span
        className="label"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          window.open(`/tag/${tag?.id}`, '_blank');
        }}
      >{tag && `${tag.type === 'text' ? '#' : ''}${tag.name}`}</span>
      <div className={visible ? 'tooltip visible' : 'tooltip'} style={position}>
        {tag && <>
          <TranslateText alias="tag-inline.tooltip.prefix" />
          {' '}<a href={`/tag/${tag.id}`} target="_blank">{tag.name}</a>
          <div className="actions">
            {role === 'guest'
              ? <TranslateText alias="tag-inline.tooltip.not-logged-in" />
              : <>
                <span className={current?.type === 'liked' ? 'likeTag active' : 'likeTag'} onClick={choose('liked')}><XIcon type="likeTag" /></span>
                <span className={current?.type === 'disliked' ? 'dislikeTag active' : 'dislikeTag'} onClick={choose('disliked')}><XIcon type="dislikeTag" /></span>
              </>}
          </div>
        </>}
      </div>
    </span>
  );
};
