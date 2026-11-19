// @vitest-environment jsdom
import { act, cleanup, createEvent, fireEvent, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PostEditor, type PostEditorHandle } from './post-editor.tsx';

interface TributeOptions {
  collection: { values: (text: string, callback: (tags: unknown) => void) => void; selectTemplate: (item: unknown) => string }[];
}

let tributeOptions: TributeOptions;
const requests: { method: string; url: string; respond: (status: number, body: unknown) => void }[] = [];

class FakeXhr {
  readyState = 0;
  status = 0;
  responseText = '';
  onreadystatechange?: () => void;
  private request = { method: '', url: '', respond: (status: number, body: unknown) => {
    Object.assign(this, { status, responseText: JSON.stringify(body), readyState: 4 });
    this.onreadystatechange?.();
  } };

  open(method: string, url: string) {
    Object.assign(this.request, { method, url });
  }

  send() {
    requests.push(this.request);
  }
}

const mount = () => {
  const ref = createRef<PostEditorHandle>();
  const { container } = render(<PostEditor ref={ref} />);
  const element = container.firstElementChild as HTMLElement;

  return { element, handle: ref.current as PostEditorHandle, input: element.querySelector('.postEditorInput') as HTMLElement };
};

beforeEach(() => {
  requests.length = 0;
  Object.assign(window, {
    escapeHtml: (value: string) => value,
    ApiSchemas: { TagListResponseSchema: { parse: (data: unknown) => data } },
    Tribute: class {
      attach = vi.fn();
      detach = vi.fn();
      constructor(options: TributeOptions) {
        tributeOptions = options;
      }
    },
  });
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('post-editor', () => {
  test('renders a placeholder and an editable area', () => {
    const { element, input } = mount();

    expect(element.querySelector('.postEditorPlaceHolder translate-text')?.getAttribute('alias')).toBe('compose-post.input.placeholder');
    expect(input.getAttribute('contenteditable')).toBe('true');
  });

  test('hides the placeholder while there is content', () => {
    const { element, input } = mount();

    input.innerHTML = 'text';
    fireEvent.input(input);
    expect(element.classList.contains('hasContent')).toBe(true);
    expect(element.querySelector('.postEditorPlaceHolder')?.classList.contains('hidden')).toBe(true);

    input.innerHTML = '';
    fireEvent.input(input);
    expect(element.classList.contains('hasContent')).toBe(false);
    expect(element.querySelector('.postEditorPlaceHolder')?.classList.contains('hidden')).toBe(false);
  });

  test('keeps the placeholder text after the content is cleared', () => {
    const { element, input } = mount();
    input.innerHTML = 'text';
    fireEvent.input(input);

    input.innerHTML = '';
    fireEvent.input(input);

    expect(element.querySelector('.postEditorPlaceHolder translate-text')).not.toBeNull();
  });

  test('value turns lines into newlines and tags into references', () => {
    const { handle, input } = mount();
    input.innerHTML = '<div>first</div><div><br></div><div>see <span tag-id="t1" contenteditable="false">#news</span></div>';

    expect(handle.value).toBe('\nfirst\n\n\nsee #!t1');
  });

  test('setting value replaces the content once', () => {
    const { element, handle, input } = mount();

    act(() => {
      handle.value = 'hello';
    });
    expect(input.innerHTML).toBe('hello');
    expect(element.classList.contains('hasContent')).toBe(true);

    act(() => {
      handle.value = '';
    });
    expect(element.classList.contains('hasContent')).toBe(false);
  });

  test('pastes as plain text', () => {
    const { input } = mount();
    const execCommand = vi.fn();
    Object.assign(document, { execCommand });
    const event = createEvent.paste(input, { clipboardData: { getData: () => '<b>raw</b>' } });

    fireEvent(input, event);

    expect(event.defaultPrevented).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('insertText', false, '<b>raw</b>');
  });

  test('looks up tags for #-completion', () => {
    mount();
    const { values, selectTemplate } = tributeOptions.collection[0];
    const callback = vi.fn();

    values('', callback);
    expect(requests).toHaveLength(0);

    values('ne', callback);
    expect(requests[0]).toMatchObject({ method: 'GET', url: '/api/tags?s=ne' });
    requests[0].respond(200, [{ id: 't1', name: 'news', type: 'text' }]);
    expect(callback).toHaveBeenCalledWith([{ id: 't1', name: 'news', type: 'text' }]);

    expect(selectTemplate({ original: { id: 't1', name: 'news' } })).toBe('<span tag-id="t1" contenteditable="false">#news</span>');
  });
});
