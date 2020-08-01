class PostPage extends Component {
  static styleSheet = '/static/components/post-page.css';

  constructor() {
    super();

    this._dispatch = () => {};

    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
    this.render = this.render.bind(this);
  }

  connectedCallback() {
    const id = this.getAttribute('post-id');

    this.innerHTML = `
      <div class="sentDate"></div>
      <h3 class="tags"></h3>
      <div class="postContent"></div>
      <h4 class="owner"></h4>
      <div class="commentSection">
        <h4>
          <translate-text alias="post-page.comments-header"></translate-text>
        </h4>
        <post-comments post-id="${id}"></post-comments>
      </div>
    `;

    this.postContent = this.querySelector('.postContent');
    this.sentDateContainer = this.querySelector('.sentDate');
    this.ownerContainer = this.querySelector('.owner');
    this.tagsContainer = this.querySelector('.tags');

    connectRedux(this.mapState, this.mapDispatch);
    this._dispatch(postsActions.request(id));
  }

  disconnectedCallback() {
    disconnectRedux(this.mapState);
  }

  mapState(state) {
    const id = this.getAttribute('post-id');
    const post = state.posts[id];
    if (id && post && post !== this._post) {
      this._post = post;
      this.render();
    }
  }

  mapDispatch(dispatch) {
    this._dispatch = dispatch;
  }

  render() {
    const id = this.getAttribute('post-id');

    this.postContent.innerHTML = parsePostContent(this._post.content, id);
    this.sentDateContainer.innerHTML = `
      <i class="far fa-calendar-alt"></i>
      <span>${new Date(parseInt(this._post.created_at, 10)).toLocaleString()}</span>
    `;

    if (!this._post.owner) {
      this.ownerContainer.innerHTML = '';
    } else {
      const ownerName = this._post.owner.name;
      this.ownerContainer.innerHTML = `
        <translate-text alias="post-preview.sent-by"></translate-text>
        &nbsp;${ownerName && ownerName !== 'null' ? ownerName : '<translate-text alias="post-preview.unknown-user"></translate-text>'}
      `;
    }

    this.tagsContainer.innerHTML = '';
    this._post.tags
      .filter(tag => !this.tagsContainer.querySelector(`[tag-id="${tag.id}"]`))
      .forEach(tag => {
        const tagNode = document.createElement('tag-inline');
        tagNode.setAttribute('tag-id', tag.id);
        this.tagsContainer.appendChild(tagNode);
      });
  }
}

customElements.define('post-page', PostPage);
