import type { ComponentType } from 'react';
import { LoginPage } from './components/login-page.tsx';
import { PostWall } from './components/post-wall.tsx';
import { PrivacyPage } from './components/privacy-page.tsx';
import { WelcomePage } from './components/welcome-page.tsx';

/** Props every page receives from the server; the same object is serialised for hydration. */
export type PageProps = Record<string, unknown>;

/**
 * The React pages by name. The server renders one into `#root` and the browser hydrates it,
 * so a page must only be listed here once its custom element counterpart is gone.
 */
export const pages: Record<string, ComponentType<PageProps>> = {
  wall: PostWall,
  login: LoginPage,
  welcome: WelcomePage,
  privacy: PrivacyPage,
};
