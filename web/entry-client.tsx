import { hydrateRoot } from 'react-dom/client';
import { PageRoot } from './page-root.tsx';
import { pages, type PageProps } from './pages.ts';

const root = document.getElementById('root');
const name = root?.dataset.page ?? '';
const props: PageProps = JSON.parse(document.getElementById('page-props')?.textContent || '{}');

if (root && pages[name]) hydrateRoot(root, <PageRoot name={name} props={props} />);
