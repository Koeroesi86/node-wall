import { createContext, useContext, type ReactNode } from 'react';

export type Translations = Record<string, string>;

const TranslationsContext = createContext<Translations>({});

export const TranslationsProvider = ({ translations, children }: { translations: Translations; children: ReactNode }) => (
  <TranslationsContext.Provider value={translations}>{children}</TranslationsContext.Provider>
);

/** The translation of an alias in the language of the page; empty when there is none. */
export const useTranslation = (alias: string) => useContext(TranslationsContext)[alias] ?? '';

/** The translations of the page as a lookup, for texts that are not rendered as elements (placeholders, alerts). */
export const useTranslate = () => {
  const translations = useContext(TranslationsContext);

  return (alias: string) => translations[alias] ?? '';
};

/** Some translations hold markup (links, emphasis); they come from the repository's own files, not from users. */
export const TranslateText = ({ alias }: { alias: string }) => (
  <span className="translate-text" dangerouslySetInnerHTML={{ __html: useTranslation(alias) }}></span>
);
