import { DeleteAccountRequestSchema, SessionListResponseSchema, SetUserNameRequestSchema, UserInfoResponseSchema } from '../../lib/api-schemas';
import { userActions } from '../store/user.ts';
import { useEffect, useState } from 'react';
import { request } from '../api.ts';
import { TranslateText, useTranslate } from '../translations.tsx';
import { useRedux } from '../use-redux.ts';
import { TagInline } from './tag-inline.tsx';
import { XIcon } from './x-icon.tsx';
import './profile-page.css';

interface ProfilePageProps {
  /** The session of the visitor, to tell it from the others. */
  sessionId?: string;
}

type SessionInfo = ReturnType<typeof SessionListResponseSchema.parse>[number];

interface UserTag {
  tag_id: string;
  type: string;
}

const dot = ' · ';

const TagList = ({ tags, type, empty }: { tags: UserTag[] | null | undefined; type: string; empty: string }) => {
  const ids = (tags ?? []).filter(tag => tag.type === type).map(tag => tag.tag_id);

  return <div className="list">{tags && (ids.length > 0 ? ids.map(id => <TagInline tagId={id} key={id} />) : empty)}</div>;
};

export const ProfilePage = ({ sessionId }: ProfilePageProps) => {
  const translate = useTranslate();
  const { state, dispatch } = useRedux();
  const [name, setName] = useState('');
  const [sessions, setSessions] = useState<SessionInfo[]>([]);

  useEffect(() => {
    dispatch(userActions.requestTags());
  }, [dispatch]);

  useEffect(() => {
    Promise.resolve()
      .then(() => request('GET', '/api/user'))
      .then(info => setName(UserInfoResponseSchema.parse(info).user.name || ''))
      .then(() => request('GET', '/api/user/sessions'))
      .then(list => setSessions(SessionListResponseSchema.parse(list)))
      .catch(console.error);
  }, []);

  const rename = () => {
    if (!name) return;

    request('PUT', '/api/user/name', SetUserNameRequestSchema.parse({ name }))
      .then(() => location.reload())
      .catch(console.error);
  };

  const exit = (session: SessionInfo) => {
    if (session.sessionId === sessionId) {
      alert(translate('profile-page.session-list.session.current.exit-alert'));
      return;
    }

    request('DELETE', `/api/user/sessions/${session.sessionId}`)
      .then(() => setSessions(current => current.filter(item => item.sessionId !== session.sessionId)))
      .catch(console.error);
  };

  /** Emails a code first, so a stolen session alone cannot delete the account. */
  const deleteAccount = async () => {
    await request('POST', '/api/user/deletion');
    const code = window.prompt(translate('profile-page.delete.code-sent'));

    if (!code) return;

    try {
      await request('DELETE', '/api/user', DeleteAccountRequestSchema.parse({ code }));
      location.href = '/';
    } catch (error) {
      alert(translate('profile-page.delete.failed'));
      throw error;
    }
  };

  return (
    <div className="profile-page">
      <h2><TranslateText alias="profile-page.header" /></h2>
      <div className="renameUserWrapper">
        <input
          type="text"
          name="name"
          className="name"
          value={name}
          placeholder={translate('profile-page.rename.input.placeholder')}
          title={translate('profile-page.rename.input.title')}
          onChange={event => setName(event.target.value)}
        />
        <button type="button" className="button" onClick={rename}>
          <TranslateText alias="profile-page.rename.button" />
        </button>
      </div>
      <div className="userTagsWrapper">
        <div className="likedTags">
          <h3><TranslateText alias="profile-page.liked-tags-list.header" /></h3>
          <TagList tags={state?.user.tags} type="liked" empty="No liked tags" />
        </div>
        <div className="dislikedTags">
          <h3><TranslateText alias="profile-page.disliked-tags-list.header" /></h3>
          <TagList tags={state?.user.tags} type="disliked" empty="No disliked tags" />
        </div>
      </div>
      <div className="sessionListWrapper">
        <h3><TranslateText alias="profile-page.session-list.header" /></h3>
        <div className="sessionList">
          {sessions.map((session) => {
            const current = session.sessionId === sessionId;

            return (
              <div className={current ? 'session current' : 'session'} title={session.details?.userAgent ?? ''} key={session.sessionId}>
                <div className="type">
                  {session.loginType === 'email' ? <XIcon type="emailLogin" /> : session.loginType}
                </div>
                <div className="meta">
                  <TranslateText alias={`profile-page.session-list.session.status.${session.sessionStatus === 'active' ? 'active' : 'pending'}`} />
                  {dot}
                  <TranslateText alias="profile-page.session-list.session.created-at" />&nbsp;{new Date(session.sessionCreatedAt).toLocaleString()}
                  {session.lastActive ? <>
                    {dot}
                    <TranslateText alias="profile-page.session-list.session.last-active" />&nbsp;
                    {new Date(session.lastActive).toLocaleString()}
                  </> : null}
                  {current && <>{dot}<TranslateText alias="profile-page.session-list.session.current" /></>}
                </div>
                <div className="actionsWrapper">
                  <button type="button" className="exit" title={translate('profile-page.session.action.exit')} onClick={() => exit(session)}>
                    <XIcon type="exit" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="accountActionsWrapper">
        <a className="button exportData" href="/api/user/export" download="my-data.json">
          <TranslateText alias="profile-page.export.button" />
        </a>
        <button type="button" className="button deleteAccount" onClick={() => deleteAccount().catch(console.error)}>
          <TranslateText alias="profile-page.delete.button" />
        </button>
      </div>
    </div>
  );
};
