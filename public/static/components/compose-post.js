class SendMessageEvent extends CustomEvent {
  constructor(message) {
    super('send-message', { detail: { message } });
  }
}

class ComposePost extends Component {
  static styleSheet = '/static/components/compose-post.css';

  connectedCallback() {
    TranslateText.getTranslation('compose-post.input.placeholder')
      .then(translation => {

        let innerHTML = `
          <post-editor placeholder="${translation.value}"></post-editor>
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
      })
      .catch(console.error);
  }
}

customElements.define('compose-post', ComposePost);
