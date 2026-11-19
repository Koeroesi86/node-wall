import { TagListResponseSchema } from '../../lib/api-schemas';
import escapeHtml from '../../lib/utils/escapeHtml';
import type { TributeCollection } from 'tributejs';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { TranslateText } from '../translations.tsx';
import './post-editor.css';

export interface PostEditorHandle {
  /** The text with the tags as `#!id` references, the way posts are sent. */
  value: string;
}

interface PostEditorProps {
  ref?: Ref<PostEditorHandle>;
}

const trigger: TributeCollection<Record<string, unknown>> = {
  // TODO: people lookup for mentions
  // TODO: add new on not found + space
  trigger: '#',
  selectTemplate: item => `<span tag-id="${escapeHtml(item.original.id)}" contenteditable="false">#${escapeHtml(item.original.name)}</span>`,
  allowSpaces: true,
  values: (text, callback) => {
    if (!text) return;

    const request = new XMLHttpRequest();
    request.onreadystatechange = () => {
      if (request.readyState === 4 && request.status === 200) {
        callback(TagListResponseSchema.parse(JSON.parse(request.responseText)));
      }
    };
    request.open('GET', `/api/tags?s=${text}`, true);
    request.send();
  },
  lookup: 'name',
  fillAttr: 'name',
};

const toValue = (html: string) => {
  const node = document.createElement('div');
  node.innerHTML = html;
  [...node.querySelectorAll('span[tag-id]')].forEach(tagNode => tagNode.replaceWith(`#!${tagNode.getAttribute('tag-id')}`));
  [...node.querySelectorAll('div')].forEach(divNode => divNode.replaceWith(divNode.innerHTML === '<br>' ? '\n\n' : `\n${divNode.innerHTML}`));
  node.innerHTML = node.innerHTML.replace(/\r/gi, '\n');

  return node.innerHTML;
};

export const PostEditor = ({ ref }: PostEditorProps) => {
  const editor = useRef<HTMLDivElement>(null);
  const [hasContent, setHasContent] = useState(false);

  const checkEmpty = () => setHasContent((editor.current?.innerHTML.trim().length ?? 0) > 0);

  useImperativeHandle(ref, () => ({
    get value() {
      return toValue(editor.current?.innerHTML ?? '');
    },
    set value(value: string) {
      if (!editor.current || editor.current.innerHTML === value) return;

      editor.current.innerHTML = value;
      checkEmpty();
    },
  }), []);

  useEffect(() => {
    const element = editor.current;
    const attached = import('tributejs').then(({ default: Tribute }) => {
      const tribute = new Tribute({ collection: [trigger] });
      if (element) tribute.attach(element);

      return tribute;
    });

    return () => {
      attached.then(tribute => element && tribute.detach(element)).catch(console.error);
    };
  }, []);

  return (
    <div className={hasContent ? 'post-editor hasContent' : 'post-editor'}>
      <div className={hasContent ? 'postEditorPlaceHolder hidden' : 'postEditorPlaceHolder'}>
        <TranslateText alias="compose-post.input.placeholder" />
      </div>
      <div
        className="postEditorInput"
        contentEditable
        suppressContentEditableWarning
        ref={editor}
        onInput={checkEmpty}
        onPaste={(event) => {
          event.stopPropagation();
          event.preventDefault();
          document.execCommand('insertText', false, event.clipboardData.getData('Text'));
        }}
      ></div>
    </div>
  );
};
