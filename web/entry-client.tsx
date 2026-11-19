import { hydrateRoot } from 'react-dom/client';
import { pages, type PageProps } from './pages.ts';

const root = document.getElementById('root');
const Page = pages[root?.dataset.page ?? ''];
const props: PageProps = JSON.parse(document.getElementById('page-props')?.textContent || '{}');

if (root && Page) hydrateRoot(root, <Page {...props} />);
