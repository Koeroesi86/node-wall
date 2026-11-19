import { userActions } from '../store/user.ts';
import { useEffect, useState, type ReactNode } from 'react';
import { TranslateText, useTranslate } from '../translations.tsx';
import { useRedux } from '../use-redux.ts';
import { XIcon } from './x-icon.tsx';
import './layout.css';

const flag = (key: string) => {
  try {
    return localStorage.getItem(key) === 'on';
  } catch {
    return false;
  }
};

const toggleFlag = (key: string) => {
  try {
    localStorage.setItem(key, flag(key) ? 'off' : 'on');
  } catch {
    // storage is not available: the choice just does not last
  }
};

const Navigation = () => {
  const translate = useTranslate();
  const { state, dispatch } = useRedux();
  // what is only known in the browser: the stored choices and the address
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [path, setPath] = useState('');
  const user = state?.user;
  const session = user?.session || undefined;
  const userName: string = user?.name ? user.name : translate('post-preview.unknown-user');

  useEffect(() => {
    setCollapsed(flag('collapsedMenu'));
    setDark(flag('darkTheme'));
    setPath(location.pathname);
    dispatch(userActions.request());
  }, [dispatch]);

  useEffect(() => {
    document.body.classList.toggle('darkTheme', dark);
  }, [dark]);

  useEffect(() => {
    if (session?.status === 'pending' && location.pathname !== '/login') {
      location.replace(`/login?session=${session.id}`);
    }
  }, [session?.status, session?.id]);

  return (
    <nav className={collapsed ? 'navigation-wrapper collapsed' : 'navigation-wrapper'}>
      <a href="/" className={path === '/' ? 'home current' : 'home'} title={translate('navigation-wrapper.home')}>
        <XIcon type="home" />
        <span><TranslateText alias="navigation-wrapper.home" /></span>
      </a>
      <a href="/wall" className={path === '/wall' ? 'wall current' : 'wall'} title={translate('navigation-wrapper.wall')}>
        <XIcon type="wall" />
        <span><TranslateText alias="navigation-wrapper.wall" /></span>
      </a>
      <div className="user">
        {user?.received && (session
          ? <>
            {session.status === 'active' && <>
              {user.role === 'admin' && (
                <a href="/moderation" className="moderation" title={translate('navigation-wrapper.moderation')}>
                  <XIcon type="moderation" />
                  <span><TranslateText alias="navigation-wrapper.moderation" /></span>
                </a>
              )}
              <a href="/profile" className="userNameWrapper" title={translate('navigation-wrapper.user.logged-in-as').replace('%USERNAME%', userName)}>
                <XIcon type="user" />
                <span>{userName}</span>
              </a>
            </>}
            {session.status === 'pending' && (
              <a href={`/login?session=${session.id}`} className="login" title={translate('navigation-wrapper.login.title')}>
                <XIcon type="user" />
                <span><TranslateText alias="navigation-wrapper.login" /></span>
              </a>
            )}
            <form action="/logout" method="post" className="logoutForm">
              <button type="submit" className="logout" title={translate('navigation-wrapper.logout')}>
                <XIcon type="logout" />
                <span><TranslateText alias="navigation-wrapper.logout" /></span>
              </button>
            </form>
          </>
          : <a href="/login" className="login" title={translate('navigation-wrapper.login.title')}>
            <XIcon type="user" />
            <span><TranslateText alias="navigation-wrapper.login" /></span>
          </a>)}
      </div>
      <div className="bottom">
        <a
          href="#"
          className="darkThemeToggle"
          title={translate('navigation-wrapper.toggle-theme')}
          onClick={(event) => {
            event.preventDefault();
            toggleFlag('darkTheme');
            setDark(flag('darkTheme'));
          }}
        >
          <XIcon type={dark ? 'lightTheme' : 'darkTheme'} />
          <span><TranslateText alias={dark ? 'navigation-wrapper.theme.bright' : 'navigation-wrapper.theme.dark'} /></span>
        </a>
        <a
          href="#"
          className="menuToggle"
          title={translate('navigation-wrapper.menu.collapse-toggle')}
          onClick={(event) => {
            event.preventDefault();
            toggleFlag('collapsedMenu');
            setCollapsed(flag('collapsedMenu'));
          }}
        >
          <XIcon type="menuToggle" />
          <span><TranslateText alias="navigation-wrapper.menu" /></span>
        </a>
      </div>
    </nav>
  );
};

/** The frame of every page: the navigation and the content with its footer. */
export const Layout = ({ children }: { children: ReactNode }) => (
  <div className="main-wrapper">
    <Navigation />
    <div className="content-wrapper">
      {children}
      <footer className="site-footer"><a href="/privacy"><TranslateText alias="navigation-wrapper.privacy" /></a></footer>
    </div>
  </div>
);
