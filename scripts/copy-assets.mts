import { cpSync, mkdirSync, statSync } from 'node:fs';

const isAsset = (source: string) => statSync(source).isDirectory() || !source.endsWith('.ts');

// Everything tsc does not emit but the app needs at runtime.
cpSync('public', 'dist/public', { recursive: true, filter: isAsset });
cpSync('lib/translations', 'dist/lib/translations', { recursive: true, filter: isAsset });

['comment', 'link', 'post', 'session']
  .forEach((type) => mkdirSync(`dist/lib/data/${type}`, { recursive: true }));
