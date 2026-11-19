import type { ComponentType } from 'react';
import { ProfilePage } from './components/profile-page.tsx';
import { LoginPage } from './components/login-page.tsx';
import { ModerationView } from './components/moderation-view.tsx';
import { PostPage } from './components/post-page.tsx';
import { PostWall } from './components/post-wall.tsx';
import { PrivacyPage } from './components/privacy-page.tsx';
import { TagPage } from './components/tag-page.tsx';
import { WelcomePage } from './components/welcome-page.tsx';

/** Props every page receives from the server; the same object is serialised for hydration. */
export type PageProps = Record<string, unknown>;

/**
 * The React pages by name. The server renders one into `#root` and the browser hydrates it,
 * so every page of the site is listed here.
 */
export const pages: Record<string, ComponentType<PageProps>> = {
  wall: PostWall,
  login: LoginPage,
  moderation: ModerationView,
  post: PostPage,
  profile: ProfilePage,
  tag: TagPage,
  welcome: WelcomePage,
  privacy: PrivacyPage,
};
