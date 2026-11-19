import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { TranslationsProvider, type Translations } from '../translations.tsx';

/** Renders with the translations the page would provide; the texts are the aliases unless given. */
export const renderWithTranslations = (ui: ReactElement, translations: Translations = new Proxy({}, { get: (_target, alias) => String(alias) }), options?: RenderOptions) => render(ui, {
  ...options,
  wrapper: ({ children }: { children: ReactNode }) => <TranslationsProvider translations={translations}>{children}</TranslationsProvider>,
});
