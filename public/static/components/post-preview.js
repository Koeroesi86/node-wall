class PostPreview extends Component {
  static styleSheet = '/static/components/post-preview.css';

  static get observedAttributes() { return ['post-id']; }

  constructor() {
    super();

    this._post = undefined;
    this._dispatch = () => {};

    this.checkOwner = this.checkOwner.bind(this);
    this.parseContent = this.parseContent.bind(this);
    this.refreshTags = this.refreshTags.bind(this);
    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
    this.requestPost = this.requestPost.bind(this);
    this.render = this.render.bind(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'post-id' && this.isConnected) {
      this.requestPost();
    }
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
    if (!this.isConnected) return;
    this.parseContent();
    this.checkOwner();
    this.refreshTags();
    this.sentDateContainer.setAttribute('href', `/post/${this.getAttribute('post-id')}`);
    this.sentDateContainer.innerHTML = new Date(parseInt(this._post.created_at, 10)).toLocaleString();
  }

  requestPost() {
    const id = this.getAttribute('post-id');
    this._dispatch(postsActions.request(id));
  }

  connectedCallback() {
    this.innerHTML = `
      <div class="loadingIndicator"><translate-text alias="post-preview.loading"></translate-text></div>
      <div class="tags"></div>
      <div class="content"></div>
      <div class="contentToggleWrapper">
        <div class="contentShadow"></div>
        <div class="contentToggle">
          <translate-text alias="post-preview.show-more"></translate-text>
        </div>
      </div>
      <div class="meta">
        <div class="sent">
          <translate-text alias="post-preview.sent-at"></translate-text>&nbsp;
          <a class="date"></a>
        </div>
        <div class="owner"></div>
      </div>
    `;
    this.contentContainer = this.querySelector('.content');
    this.tagsContainer = this.querySelector('.tags');
    this.sentDateContainer = this.querySelector('.sent .date');

    this.querySelector('.contentToggle').addEventListener('click', e => {
      this.contentContainer.style.maxHeight = this.contentContainer.scrollHeight + 'px';
      setTimeout(() => {
        this.classList.add('showAll');
      }, 300);
    });

    window.connectRedux(this.mapState, this.mapDispatch);
    this.requestPost();
  }

  parseContent() {
    if (!this.isConnected || !this._post) return;

    this.contentContainer.innerHTML = parsePostContent(this._post.content, this.getAttribute('post-id'));

    if (this.querySelectorAll('.contentLine').length > 5) {
      this.classList.add('long');
    }
  }

  checkOwner() {
    if (!this.isConnected || !this._post) return;
    const owner = this.querySelector('.owner');

    if (!this._post.owner) {
      owner.innerHTML = '';
      return;
    }
    const ownerName = this._post.owner.name;
    owner.innerHTML = `
      <translate-text alias="post-preview.sent-by"></translate-text>
      &nbsp;${ownerName && ownerName !== 'null' ? ownerName : '<translate-text alias="post-preview.unknown-user"></translate-text>'}
    `;
  }

  refreshTags() {
    if (!this.isConnected || !this._post) return;
    if (this._post.tags.length === 0) {
      this.classList.add('noTags');
    } else {
      this.classList.remove('noTags');
    }

    if (this.tagsContainer) {
      this.tagsContainer.innerHTML = '';
      this._post.tags.forEach(tag => {
        if (this.tagsContainer.querySelector(`[tag-id="${tag.id}"]`)) return;

        const tagNode = document.createElement('tag-inline');
        tagNode.setAttribute('tag-id', tag.id);

        this.tagsContainer.appendChild(tagNode);
      });
    }
  }
}

window.customElements.define('post-preview', PostPreview);
