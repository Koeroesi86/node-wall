import { cpSync, mkdirSync, statSync } from 'node:fs';

const isAsset = (source: string) => statSync(source).isDirectory() || !source.endsWith('.ts');

// Everything tsc does not emit but the app needs at runtime.
cpSync('public', 'dist/public', { recursive: true, filter: isAsset });
// The scripts of the pages are bundled by Vite (build:web); only the icon font and its styles are self hosted.
cpSync('node_modules/@fortawesome/fontawesome-free/webfonts', 'dist/public/static/vendor/fontawesome/webfonts', { recursive: true });
['all.min.css', 'v4-shims.min.css'].forEach((file) => {
  mkdirSync('dist/public/static/vendor/fontawesome/css', { recursive: true });
  cpSync(`node_modules/@fortawesome/fontawesome-free/css/${file}`, `dist/public/static/vendor/fontawesome/css/${file}`);
});

cpSync('lib/translations', 'dist/lib/translations', { recursive: true, filter: isAsset });

['comment', 'link', 'post', 'session']
  .forEach((type) => mkdirSync(`dist/lib/data/${type}`, { recursive: true }));
