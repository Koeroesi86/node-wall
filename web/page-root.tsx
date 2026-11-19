import type { ComponentType } from 'react';
import { Layout } from './components/layout.tsx';
import { pages, type PageProps } from './pages.ts';
import { TranslationsProvider, type Translations } from './translations.tsx';

/** What the server renders and the browser hydrates: the page in its layout, with the translations of the request's language. */
export const PageRoot = ({
  name,
  props,
  registry = pages,
}: {
  name: string;
  props: PageProps & { translations?: Translations };
  registry?: Record<string, ComponentType<PageProps>>;
}) => {
  const { translations = {}, ...pageProps } = props;
  const Page = registry[name];

  return Page && <TranslationsProvider translations={translations}><Layout><Page {...pageProps} /></Layout></TranslationsProvider>;
};
