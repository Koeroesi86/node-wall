class PostCommentsItem extends Component {
  static styleSheet = '/static/components/post-comments-item.css';

  static get observedAttributes() { return ['comment-id']; }

  constructor() {
    super();

    this._dispatch = () => {};

    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
  }

  connectedCallback() {
    const id = this.getAttribute('comment-id');

    this.innerHTML = `
      <div class="body"></div>
      <a class="createdAt" href="#${this.getAttribute('id') || ''}"></a>
    `;

    this.bodyNode = this.querySelector('.body');
    this.createdAtNode = this.querySelector('.createdAt');

    connectRedux(this.mapState, this.mapDispatch);
    this._dispatch(commentsActions.request(id));
  }

  mapState(state, prevState) {
    const id = this.getAttribute('comment-id');

    if (state.comments[id] && state.comments[id] !== prevState.comments[id]) {
      this.bodyNode.innerHTML = state.comments[id].body;
      this.createdAtNode.innerHTML = new Date(state.comments[id].created_at).toLocaleString();
    }
  }

  mapDispatch(dispatch) {
    this._dispatch = dispatch;
  }
}

customElements.define('post-comments-item', PostCommentsItem);
