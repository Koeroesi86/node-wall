// @vitest-environment jsdom
import { cleanup } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { WelcomePage } from './welcome-page.tsx';

afterEach(cleanup);

test('renders its translated header and note', () => {
  const { container } = render(<WelcomePage />);

  expect([...container.querySelectorAll('.translate-text')].map(node => node.textContent))
    .toEqual(['welcome-page.header', 'welcome-page.note']);
});
