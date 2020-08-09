class SendMessageEvent extends CustomEvent {
  constructor(message) {
    super('send-message', { detail: { message } });
  }
}

class ComposePost extends Component {
  static styleSheet = '/static/components/compose-post.css';

  connectedCallback() {
        let innerHTML = `
          <post-editor></post-editor>
          <button class="send" type="button">
            <span class="toSend">
              <translate-text alias="compose-post.button.to-send"></translate-text>
            </span>
            <span class="inProgress">
              <translate-text alias="compose-post.button.sending"></translate-text>
            </span>
          </button>
        `;

        this.innerHTML += innerHTML;

        this.editor = this.querySelector('post-editor');
        this.button = this.querySelector('.send');

        this.button.addEventListener('click', e => {
          const message = this.editor.value;
          if (message && message.length > 0) {
            this.classList.add('sending');
            Promise.resolve()
              .then(() => createPost(message))
              .then((res) => {
                this.editor.value = '';
                this.classList.remove('sending');
              })
              .catch(console.error);
          }
        });
  }
}

customElements.define('compose-post', ComposePost);
