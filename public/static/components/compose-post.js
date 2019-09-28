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
        }
        
        compose-post .send {
          flex: 0 0;
          display: block;
          padding: 0 6px;
          border: 0;
          line-height: 24px;
          color: #ffffff;
          background-color: rgba(255, 255, 255, 0.1);
          cursor: pointer;
        }

        compose-post .send[disabled] {
          opacity: 0.6;
        }
      </style>
      <post-editor placeholder="Min jár a fejed?"></post-editor>
      <button class="send" type="button">Küldés</button>
    `;

    this.innerHTML += innerHTML;

    this.editor = this.querySelector('post-editor');
    this.button = this.querySelector('.send');

    this.button.addEventListener('click', e => {
      const message = this.editor.value;
      this.dispatchEvent(new SendMessageEvent(message));
      this.editor.value = '';
    });
  }
}

window.customElements.define('compose-post', ComposePost);
