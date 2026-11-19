// @vitest-environment jsdom
import { cleanup } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { renderWithTranslations as render } from '../test-utils/render.tsx';
import { PrivacyPage } from './privacy-page.tsx';

afterEach(cleanup);

test('renders every section and the operator contact as text', () => {
  const { container } = render(<PrivacyPage controller="Op <b>" contact="me@example.com" />);

  expect(container.querySelectorAll('.translate-text')).toHaveLength(11);
  expect(container.querySelector('.controller')?.textContent).toBe('Op <b>');
  expect(container.querySelector('.contact')?.getAttribute('href')).toBe('mailto:me@example.com');
  expect(container.querySelector('.controller b')).toBeNull();
});

test('has no mail link without a contact', () => {
  expect(render(<PrivacyPage />).container.querySelector('.contact')?.hasAttribute('href')).toBe(false);
});
