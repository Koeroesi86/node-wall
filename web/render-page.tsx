import { renderToString } from 'react-dom/server';
import type { ComponentType } from 'react';
import { PageRoot } from './page-root.tsx';
import { pages, type PageProps } from './pages.ts';

/** Renders a registered page to markup; `undefined` when the page is not migrated to React yet. */
export const renderPage = (
  name: string,
  props: PageProps = {},
  registry: Record<string, ComponentType<PageProps>> = pages,
) => registry[name] ? renderToString(<PageRoot name={name} props={props} registry={registry} />) : undefined;
