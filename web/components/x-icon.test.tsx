// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import { XIcon } from './x-icon.tsx';

test('renders the icon of its type', () => {
  expect(render(<XIcon type="home" />).container.innerHTML).toBe('<span class="x-icon"><i class="fas fa-home"></i></span>');
});

test('marks decorative icons as hidden from assistive technology', () => {
  expect(render(<XIcon type="menuToggle" />).container.innerHTML).toBe('<span class="x-icon"><i class="fa fa-bars" aria-hidden="true"></i></span>');
});

test('renders nothing for an unknown type', () => {
  expect(render(<XIcon type="nope" />).container.innerHTML).toBe('<span class="x-icon"></span>');
});
