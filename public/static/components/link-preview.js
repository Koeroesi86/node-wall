class CustomLink extends HTMLAnchorElement {
  constructor() {
    super();

    Component.prototype._init.apply(this, arguments);
  }

  onStyleSheetLoaded() {

  }
}

class LinkPreview extends CustomLink {
  static styleSheet = '/static/components/link-preview.css';

  constructor() {
    super();

    this.fetchLink = this.fetchLink.bind(this);
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
    this.fetchLink();
  }

  fetchLink() {
    const href = this.getAttribute('href');
    const postId = this.getAttribute('post-id');
    if (!href || !postId) return;
    const request = new XMLHttpRequest();
    request.onreadystatechange  = e => {
      if (request.readyState === 4 && request.status === 200) {
        const linkPreview = JSON.parse(request.responseText);
        if (linkPreview.title) this.setAttribute('title', linkPreview.title);

        if (linkPreview.embedCode && false) { //disabled until mobile experience sorted
          this.preview.innerHTML = linkPreview.embedCode;
        } else {
          this.preview.innerHTML = `
            ${linkPreview.image ? `<img src="${linkPreview.image}" class="image" alt="${linkPreview.title}" />`: ''}
            <div class="meta">
              <div class="title" title="${linkPreview.title}">${linkPreview.title}</div>
              <div class="description">
                ${linkPreview.description.substring(0, 150)}
                ${linkPreview.description.length > 150 ? '&hellip;' : ''}
              </div>
              <div class="url">${linkPreview.url}</div>
            </div>
          `;
          if (linkPreview.image) {
            this.preview.classList.add('hasImage');
          }
        }
      }
    };
    request.onerror = () => {
    };
    request.open('GET', `/api/link?post=${postId}&uri=${encodeURIComponent(href)}`, true);
    request.setRequestHeader('Content-Type', 'application/json');
    request.send();
  }
}

window.customElements.define('link-preview', LinkPreview, { extends: 'a' });
