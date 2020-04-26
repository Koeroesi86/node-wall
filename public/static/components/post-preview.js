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
    this.getTag = this.getTag.bind(this);
    this.checkOwner = this.checkOwner.bind(this);
    this.refreshTags = this.refreshTags.bind(this);
  }

  connectedCallback() {
    const createdRaw = this.getAttribute('created');
    const created = new Date(parseInt(createdRaw, 10));

    this.innerHTML = `
      <div class="loadingIndicator"><translate-text alias="post-preview.loading" /></div>
      <div class="tags"></div>
      <div class="content"></div>
      <div class="meta">
        <div class="sent"><translate-text alias="post-preview.sent-at" /> ${created.toLocaleString()}</div>
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
    let content = this.content;
    content = content.trim();
    content = content.replace(/\n{3,}/gi, '\n\n');
    content = content.split('\n').map(line => `
      <div class="contentLine">
        ${linkify(stripLine(line), this.getAttribute('post-id')) || '&nbsp;'}
      </div>
    `).join('');
    if (this.tags.length === 0) this.classList.add('noTags')
    this.tags.forEach(tag => {
      content = content.replace(`#!${tag.id}`, `<tag-inline tag-id="${tag.id}"></tag-inline>`)
    });
    const matches = [...content.matchAll(/#!([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/gi)];
    if (matches) {
      this.classList.add('loading');
      Promise.resolve()
        .then(() => Promise.all([...matches].map(match => this.getTag(match[1]))))
        .then(tags => {
          tags.forEach(tag => {
            content = content.replace(`#!${tag.id}`, `<tag-inline tag-id="${tag.id}"></tag-inline>`)
          });
          this.contentContainer.innerHTML = content;
          this.classList.remove('loading')
        })
        .catch(() => {
          Promise.resolve()
            .then(() => new Promise(r => setTimeout(r, 500)))
            .then(() => this.parseContent());
        });
    } else {
      this.contentContainer.innerHTML = content;
    }
  }

  /**
   * @param {string} id
   * @returns {Promise<unknown>}
   */
  getTag(id) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const tag = JSON.parse(request.responseText);
            if (tag) resolve(tag);
          }

          reject();
        }
      };
      request.open("GET", `/api/tags/${id}`, true);
      request.send();
    });
  }

  checkOwner() {
    const ownerId = this.getAttribute('owner-id');
    if (!ownerId) return;
    const ownerName = this.getAttribute('owner-name');
    const owner = this.querySelector('.owner');
    owner.innerText = `Beküldő: ${ownerName && ownerName !== 'null' ? ownerName : 'Névtelen idegen'}`;
  }

  refreshTags() {
    if (this.tagsContainer) {
      this.tagsContainer.innerHTML = '';
      this._tags.forEach(tag => {
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
