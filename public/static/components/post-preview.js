function linkify(content = '', postId) {
  let result = content;

  result = result.replace(
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/igm,
    `<a is="link-preview" href="$1" post-id="${postId}"></a>`
  );

  result = result.replace(
    /(^|[^\/])(www\.[\S]+(\b|$))/gim,
    `$1<a is="link-preview" href="https://$2" post-id="${postId}"></a>`
  );

  return result;
}

function stripLine(line = '') {
  const tmp = document.createElement('span');
  tmp.innerHTML = line;
  return tmp.innerText.replace(/&amp;nbsp;/gi, '&nbsp;');
}

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
      <div class="meta">
        <div class="sent">
          <translate-text alias="post-preview.sent-at"></translate-text>&nbsp;
          <span class="date"></span>
        </div>
        <div class="owner"></div>
      </div>
    `;
    this.contentContainer = this.querySelector('.content');
    this.tagsContainer = this.querySelector('.tags');
    this.sentDateContainer = this.querySelector('.sent .date');

    window.connectRedux(this.mapState, this.mapDispatch);
    this.requestPost();
  }

  parseContent() {
    if (!this.isConnected || !this._post) return;
    let content = this._post.content;
    content = content.trim();
    content = content.replace(/\n{3,}/gi, '\n\n');
    content = content.split('\n').map(line =>
      `<div class="contentLine">${linkify(stripLine(line), this.getAttribute('post-id')) || '&nbsp;'}</div>`).join('\n');

    [...content.matchAll(/#!([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/g)]
      .filter(match => match && match[1])
      .forEach(match => {
        content = content.replace(`#!${match[1]}`, `<tag-inline tag-id="${match[1]}"></tag-inline>`);
      });

    this.contentContainer.innerHTML = content;
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
