// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ComposePost } from './compose-post.tsx';

type Editor = HTMLElement & { value: string };

const setCreatePost = (createPost: () => Promise<unknown>) => Object.assign(window, { createPost: vi.fn(createPost) });

const compose = () => {
  const { container } = render(<ComposePost />);

  return {
    element: container.firstElementChild as HTMLElement,
    editor: container.querySelector('post-editor') as Editor,
    button: container.querySelector('.send') as HTMLElement,
  };
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('compose-post', () => {
  test('renders an editor and a send button', () => {
    const { element, editor, button } = compose();

    expect(editor).not.toBeNull();
    expect(button.querySelector('translate-text')?.getAttribute('alias')).toBe('compose-post.button.to-send');
    expect(element.querySelector('translate-text[alias="compose-post.button.sending"]')).not.toBeNull();
  });

  test('does not send an empty message', () => {
    setCreatePost(() => Promise.resolve());
    const { editor, button } = compose();
    editor.value = '';

    fireEvent.click(button);

    expect(createPost).not.toHaveBeenCalled();
  });

  test('sends the message, shows progress and clears the editor', async () => {
    let finish: () => void = () => undefined;
    setCreatePost(() => new Promise<void>(resolve => (finish = resolve)));
    const { element, editor, button } = compose();
    editor.value = 'hello';

    await act(async () => fireEvent.click(button));

    expect(createPost).toHaveBeenCalledWith('hello');
    expect(element.classList.contains('sending')).toBe(true);

    await act(async () => finish());

    expect(element.classList.contains('sending')).toBe(false);
    expect(editor.value).toBe('');
  });

  test('keeps the message when sending fails', async () => {
    setCreatePost(() => Promise.reject(new Error('offline')));
    const { editor, button } = compose();
    editor.value = 'hello';

    await act(async () => fireEvent.click(button));

    expect(editor.value).toBe('hello');
    expect(console.error).toHaveBeenCalled();
  });
});
