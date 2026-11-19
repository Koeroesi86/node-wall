import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadComponents, type ComponentsBrowser } from '../../../lib/test-utils/components';

let page: ComponentsBrowser;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  page?.close();
  vi.restoreAllMocks();
});

describe('Component base', () => {
  beforeEach(async () => {
    page = await loadComponents(['content-wrapper']);
  });

  test('adds its stylesheet once per element type', () => {
    page.mount('<content-wrapper></content-wrapper>');
    page.mount('<content-wrapper></content-wrapper>');

    const links = page.document.querySelectorAll('link[rel="stylesheet"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/static/components/content-wrapper.css');
  });

  test('notifies later instances asynchronously that the stylesheet is available', () => {
    page.mount('<content-wrapper></content-wrapper>');
    page.mount('<content-wrapper></content-wrapper>');

    expect(page.pendingTimers()).toEqual([expect.objectContaining({ delay: 1 })]);
  });
});

describe('wrappers', () => {
  test('are registered as custom elements', async () => {
    page = await loadComponents(['main-wrapper', 'content-wrapper']);
    ['main-wrapper', 'content-wrapper'].forEach(name => expect(page.window.customElements.get(name)).toBeDefined());
  });
});

describe('translate-text', () => {
  beforeEach(async () => {
    page = await loadComponents(['translate-text']);
  });

  test('requests its translation when connected', () => {
    page.mount('<translate-text alias="a"></translate-text>');
    expect(page.redux.dispatched()).toEqual([{ type: 'TRANSLATIONS_REQUEST', payload: { alias: 'a' } }]);
  });

  test('shows the translation once it is in the state', () => {
    const element = page.mount('<translate-text alias="a"></translate-text>');

    page.redux.setState({ translations: { a: 'Hello <b>there</b>' } });

    expect(element.innerHTML).toBe('Hello <b>there</b>');
  });

  test('ignores other aliases and not yet received translations', () => {
    const element = page.mount('<translate-text alias="a"></translate-text>');

    page.redux.setState({ translations: { b: 'Other' } });

    expect(element.innerHTML).toBe('');
  });

  test('requests again when the alias changes', () => {
    const element = page.mount('<translate-text alias="a"></translate-text>');
    page.redux.clearDispatched();

    element.setAttribute('alias', 'b');

    expect(page.redux.dispatched()).toEqual([{ type: 'TRANSLATIONS_REQUEST', payload: { alias: 'b' } }]);
  });

  test('stops listening when removed', () => {
    const element = page.mount('<translate-text alias="a"></translate-text>');
    expect(page.redux.listenerCount()).toBe(1);

    element.remove();

    expect(page.redux.listenerCount()).toBe(0);
  });
});

describe('x-icon', () => {
  beforeEach(async () => {
    page = await loadComponents(['x-icon']);
  });

  test('renders the icon of its type', () => {
    expect(page.mount('<x-icon type="home"></x-icon>').innerHTML).toBe('<i class="fas fa-home"></i>');
  });

  test('renders nothing for an unknown type', () => {
    expect(page.mount('<x-icon type="nope"></x-icon>').innerHTML).toBe('');
  });

  test('re-renders when the type changes', () => {
    const element = page.mount('<x-icon type="home"></x-icon>');
    element.setAttribute('type', 'user');
    expect(element.innerHTML).toBe('<i class="far fa-user"></i>');
  });
});
