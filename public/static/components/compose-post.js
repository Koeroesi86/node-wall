class SendMessageEvent extends CustomEvent {
  constructor(message) {
    super('send-message', { detail: { message } });
  }
}

class ComposePost extends HTMLElement {
  connectedCallback() {
    let innerHTML = `
      <style type="text/css">
        compose-post {
          display: flex;
          flex-direction: column;
          max-height: 100vh;
        }
        
        compose-post .send {
          flex: 0 0;
          display: block;
          padding: 0 6px;
          line-height: 24px;
          color: var(--main-button-text-color);
          background-color: rgba(var(--main-button-background-color-rgb), 0.1);
          border: 0px solid rgba(var(--main-button-border-color-rgb), 1);
          cursor: pointer;
        }

        compose-post.sending .send {
          opacity: 0.6;
        }
        
        compose-post.sending .send .toSend,
        compose-post .send .inProgress {
          display: none;
        }
        
        compose-post.sending .send .inProgress {
          display: inline;
        }
      </style>
      <post-editor placeholder="Min jár a fejed?"></post-editor>
      <button class="send" type="button">
        <span class="toSend">Küldés</span>
        <span class="inProgress">Küldés folyamatban...</span>
      </button>
    `;

    this.innerHTML += innerHTML;

    this.editor = this.querySelector('post-editor');
    this.button = this.querySelector('.send');

    this.button.addEventListener('click', e => {
      const message = this.editor.value;
      if (message && message.length > 0) {
        this.classList.add('sending');
        const request = new XMLHttpRequest();
        request.onreadystatechange  = e => {
          if (request.readyState === 4 && request.status === 200) {
            this.editor.value = '';
            this.classList.remove('sending');
          }
        };
        request.onerror = () => {
        };
        request.open("POST", "/api/posts", true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify({ content: message }));
      }
    });
  }
}

window.customElements.define('compose-post', ComposePost);
