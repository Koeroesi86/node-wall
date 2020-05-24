class PostPage extends Component {
  static styleSheet = '/static/components/post-page.css';

  connectedCallback() {
    const id = this.getAttribute('post-id');
    this.innerHTML = `
      <post-preview post-id="${id}"></post-preview>
    `;
  }
}

window.customElements.define('post-page', PostPage);
