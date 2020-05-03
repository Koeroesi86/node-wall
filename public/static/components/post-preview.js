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

  constructor() {
    super();
    this._tags = [];
    this._content = '';

    this.checkOwner = this.checkOwner.bind(this);
    this.parseContent = this.parseContent.bind(this);
    this.refreshTags = this.refreshTags.bind(this);
  }

  connectedCallback() {
    const createdRaw = this.getAttribute('created');
    const created = new Date(parseInt(createdRaw, 10));

    this.innerHTML = `
      <div class="loadingIndicator"><translate-text alias="post-preview.loading"></translate-text></div>
      <div class="tags"></div>
      <div class="content"></div>
      <div class="meta">
        <div class="sent"><translate-text alias="post-preview.sent-at"></translate-text> ${created.toLocaleString()}</div>
        <div class="owner"></div>
      </div>
    `;
    this.contentContainer = this.querySelector('.content');
    this.tagsContainer = this.querySelector('.tags');
    this.parseContent();
    this.checkOwner();
    this.refreshTags();
  }

  /** @returns {string} */
  get content() {
    return this._content;
  }

  /** @param {string} content */
  set content(content) {
    this._content = content;
    this.parseContent();
  }

  parseContent() {
    if (!this.isConnected) return;
    let content = this.content;
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
    if (!this.isConnected) return;
    const ownerId = this.getAttribute('owner-id');
    if (!ownerId) return;
    const ownerName = this.getAttribute('owner-name');
    const owner = this.querySelector('.owner');
    owner.innerHTML = `
      <translate-text alias="post-preview.sent-by"></translate-text>
      &nbsp;${ownerName && ownerName !== 'null' ? ownerName : '<translate-text alias="post-preview.unknown-user"></translate-text>'}
    `;
  }

  refreshTags() {
    if (!this.isConnected) return;
    if (this.tags.length === 0) {
      this.classList.add('noTags');
    } else {
      this.classList.remove('noTags');
    }

    if (this.tagsContainer) {
      this.tagsContainer.innerHTML = '';
      this._tags.forEach(tag => {
        if (this.tagsContainer.querySelector(`[tag-id="${tag.id}"]`)) return;

        const tagNode = document.createElement('tag-inline');
        tagNode.setAttribute('tag-id', tag.id);

        this.tagsContainer.appendChild(tagNode);
      });
    }
  }

  /** @param {Array} tags */
  set tags(tags) {
    this._tags = tags;
    this.refreshTags();
  }

  /** @returns {Array} */
  get tags() {
    return this._tags;
  }
}

window.customElements.define('post-preview', PostPreview);
