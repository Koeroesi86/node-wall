class LinkPreview extends HTMLAnchorElement {
  static styleSheet = '/static/components/link-preview.css';

  constructor() {
    super();

    Component.prototype._init.apply(this, arguments);
    this._dispatch = () => {};
    this._link = null;

    this.renderLink = this.renderLink.bind(this);
    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
  }

  connectedCallback() {
    let innerHTML = `
      <div class="preview">
        ${this.getAttribute('href') || ''}
      </div>
    `;
    this.setAttribute('target', '_blank');

    this.innerHTML = innerHTML;

    this.preview = this.querySelector('.preview');
    window.connectRedux(this.mapState, this.mapDispatch);

    this._dispatch(linksActions.request(this.getAttribute('href'), this.getAttribute('post-id')));
  }

  mapState(state) {
    const href = this.getAttribute('href');
    if (state.links[href] !== this._link) {
      this._link = state.links[href];
      this.renderLink();
    }
  }

  mapDispatch(dispatch) {
    this._dispatch = dispatch;
  }

  renderLink() {
    if (!this._link) return;

    if (this._link.title) this.setAttribute('title', this._link.title);

    if (this._link.embedCode && false) { //disabled until mobile experience sorted
      this.preview.innerHTML = this._link.embedCode;
    } else {
      this.preview.innerHTML = `
        ${this._link.image ? `<img src="${this._link.image}" class="image" alt="${this._link.title}" />`: ''}
        <div class="meta">
          <div class="title" title="${this._link.title}">${this._link.title}</div>
          <div class="description">
            ${this._link.description.substring(0, 150)}
            ${this._link.description.length > 150 ? '&hellip;' : ''}
          </div>
          <div class="url">${this._link.url}</div>
        </div>
      `;

      if (this._link.image) {
        this.preview.classList.add('hasImage');
      }
    }
  }
}

window.customElements.define('link-preview', LinkPreview, { extends: 'a' });
