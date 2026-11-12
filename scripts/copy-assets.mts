import { cpSync, mkdirSync, statSync } from 'node:fs';

const isAsset = (source: string) => statSync(source).isDirectory() || !source.endsWith('.ts');

// Everything tsc does not emit but the app needs at runtime.
cpSync('public', 'dist/public', { recursive: true, filter: isAsset });
// Third-party browser scripts are self hosted so the CSP can restrict scripts to this origin.
mkdirSync('dist/public/static/vendor', { recursive: true });
[
  'node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js',
  'node_modules/redux/dist/redux.min.js',
  'node_modules/tributejs/dist/tribute.min.js',
].forEach((source) => cpSync(source, `dist/public/static/vendor/${source.split('/').pop()}`));

cpSync('node_modules/@fortawesome/fontawesome-free/webfonts', 'dist/public/static/vendor/fontawesome/webfonts', { recursive: true });
['all.min.css', 'v4-shims.min.css'].forEach((file) => {
  mkdirSync('dist/public/static/vendor/fontawesome/css', { recursive: true });
  cpSync(`node_modules/@fortawesome/fontawesome-free/css/${file}`, `dist/public/static/vendor/fontawesome/css/${file}`);
});

cpSync('lib/translations', 'dist/lib/translations', { recursive: true, filter: isAsset });

['comment', 'link', 'post', 'session']
  .forEach((type) => mkdirSync(`dist/lib/data/${type}`, { recursive: true }));
