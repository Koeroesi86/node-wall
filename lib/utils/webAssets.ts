import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import escapeHtml from './escapeHtml';

export interface ManifestEntry {
  file: string;
  css?: string[];
}

export type Manifest = Record<string, ManifestEntry>;

const staticBase = '/static/app/';
const manifestPath = resolve(__dirname, '../../public/static/app/.vite/manifest.json');

let cached: Manifest | undefined;

/** The manifest of the Vite client build; `undefined` until `npm run build` has produced it. */
export const loadManifest = (): Manifest | undefined => {
  try {
    cached ??= JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return undefined;
  }

  return cached;
};

/** The stylesheet and module script tags for a client entry, with the hashed file names of the build. */
export const getEntryTags = (entry: string, manifest: Manifest | undefined = loadManifest()) => {
  const item = manifest?.[entry];

  return !item
    ? ''
    : [
      ...(item.css ?? []).map(file => `<link rel="stylesheet" href="${escapeHtml(staticBase + file)}">`),
      `<script type="module" src="${escapeHtml(staticBase + item.file)}"></script>`,
    ].join('\n');
};
