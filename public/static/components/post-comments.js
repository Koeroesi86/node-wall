class PostComments extends Component {
  static styleSheet = '/static/components/post-comments.css';

  static get observedAttributes() { return ['post-id']; }

  constructor() {
    super();

    this._dispatch = () => {};

    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
  }

  connectedCallback() {
    const id = this.getAttribute('post-id');

    this.innerHTML = `
      <div class="commentsList"></div>
      <div class="composer">
        <div class="body" contenteditable="true"></div>
        <button class="send">
          <translate-text alias="post-comments.send-label"></translate-text>
        </button>
      </div>
    `;

    this.contentBodyNode = this.querySelector('.body');
    this.commentsListNode = this.querySelector('.commentsList');

    this.querySelector('.send').addEventListener('click', e => {
      e.preventDefault();

      this._dispatch(commentsActions.create(id, this.contentBodyNode.innerHTML, null));
    });

    connectRedux(this.mapState, this.mapDispatch);
  }

  mapState(state, prevState) {
    const postId = this.getAttribute('post-id');

    if (state.posts[postId] && state.posts[postId].comments) {
      if (state.posts[postId].comments.length > 0) {
        state.posts[postId].comments.forEach(id => {
          if (this.commentsListNode.querySelector(`post-comments-item[comment-id="${id}"]`)) {
            return;
          }

          const commentItem = document.createElement('post-comments-item');
          commentItem.setAttribute('id', `comment-${id}`);
          commentItem.setAttribute('comment-id', id);
          this.commentsListNode.appendChild(commentItem);
        });
      } else {
        this.commentsListNode.innerHTML = `
          <translate-text alias="post-comments.no-comments"></translate-text>
        `;
      }
    }
  }

  mapDispatch(dispatch) {
    this._dispatch = dispatch;
  }
}

customElements.define('post-comments', PostComments);
