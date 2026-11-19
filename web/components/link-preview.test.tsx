// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { fakeRedux } from '../test-utils/redux.ts';
import { LinkPreview } from './link-preview.tsx';

let redux: ReturnType<typeof fakeRedux>;

const href = 'https://example.com/a';
const link = { url: href, title: 'Title', description: 'A description', image: 'https://example.com/i.png' };

const mount = () => render(<LinkPreview href={href} postId="p1" />).container.firstElementChild as HTMLElement;

beforeEach(() => {
  redux = fakeRedux();
  redux.setState({ links: {} });
});

afterEach(cleanup);

describe('link-preview', () => {
  test('shows the url while the preview loads and requests it', () => {
    const element = mount();

    expect(element.getAttribute('target')).toBe('_blank');
    expect(element.querySelector('.preview')?.textContent?.trim()).toBe(href);
    expect(redux.dispatched).toEqual([{ type: 'LINKS_REQUEST', payload: { href, postId: 'p1' } }]);
  });

  test('renders the preview once it is available', () => {
    const element = mount();

    act(() => redux.setState({ links: { [href]: link } }));

    expect(element.getAttribute('title')).toBe('Title');
    expect(element.querySelector('.title')?.textContent).toBe('Title');
    expect(element.querySelector('.description')?.textContent?.trim()).toBe('A description');
    expect(element.querySelector('.url')?.textContent).toBe(href);
    expect(element.querySelector('img.image')?.getAttribute('src')).toBe('https://example.com/i.png');
    expect(element.querySelector('.preview')?.classList.contains('hasImage')).toBe(true);
  });

  test('shortens long descriptions', () => {
    const element = mount();

    act(() => redux.setState({ links: { [href]: { ...link, description: 'x'.repeat(200) } } }));

    expect(element.querySelector('.description')?.textContent).toMatch(/x{150}\s*…/);
    expect(element.querySelector('.description')?.textContent).not.toContain('x'.repeat(151));
  });

  test('renders previews without an image', () => {
    const element = mount();

    act(() => redux.setState({ links: { [href]: { ...link, image: '' } } }));

    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('.preview')?.classList.contains('hasImage')).toBe(false);
  });
});
