import { useRef, useState } from 'react';
import { PostEditor, type PostEditorHandle } from './post-editor.tsx';
import './compose-post.css';

export const ComposePost = () => {
  const editor = useRef<PostEditorHandle>(null);
  const [sending, setSending] = useState(false);

  const send = () => {
    const message = editor.current?.value;
    if (!message) return;

    setSending(true);
    Promise.resolve()
      .then(() => createPost(message))
      .then(() => {
        if (editor.current) editor.current.value = '';
        setSending(false);
      })
      .catch(console.error);
  };

  return (
    <div className={sending ? 'compose-post sending' : 'compose-post'}>
      <PostEditor ref={editor} />
      <button className="send" type="button" onClick={send}>
        <span className="toSend">
          <translate-text alias="compose-post.button.to-send"></translate-text>
        </span>
        <span className="inProgress">
          <translate-text alias="compose-post.button.sending"></translate-text>
        </span>
      </button>
    </div>
  );
};
