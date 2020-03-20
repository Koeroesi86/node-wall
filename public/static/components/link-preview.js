class LinkPreview extends HTMLAnchorElement {
  constructor() {
    super();

    this.fetchLink = this.fetchLink.bind(this);
  }

  connectedCallback() {
    let innerHTML = `
      <style type="text/css">
        a[is="link-preview"] {
          display: block;
          text-decoration: none;
          border: 1px solid rgba(var(--main-link-highlighted-color-rgb), 0.2);
          margin: 6px 0;
          padding: 0;
          background: rgba(var(--main-link-highlighted-color-rgb), 0.1);
          border-radius: 3px;
          overflow: hidden;
          transition: all .2s ease-in-out;
        }

        a[is="link-preview"]:hover {
          border-color: rgba(var(--main-link-highlighted-color-rgb), 0.6);
          background: rgba(var(--main-link-highlighted-color-rgb), 0.2);
        }

        a[is="link-preview"] .preview {
          display: flex;
          flex-direction: row;
        }

        a[is="link-preview"] .preview .image {
          max-width: 100%;
          width: 480px;
          border-right: 1px solid rgba(var(--main-link-highlighted-color-rgb), 0.1);
        }

        a[is="link-preview"] .preview .meta {
          flex: 1 1 0;
          display: flex;
          flex-direction: column;
          margin: 0;
          padding: 6px 12px;
          border: 0;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        a[is="link-preview"] .preview .title {
          font-size: 14px;
          margin-bottom: 6px;
        }

        a[is="link-preview"] .preview .description {
          flex: 1 1 0;
          font-size: 12px;
          margin-bottom: 6px;
        }

        a[is="link-preview"] .preview .url {
          font-size: 12px;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          color: rgba(var(--main-link-highlighted-color-rgb), .6);
        }

        a[is="link-preview"] .preview iframe {
          border: 0;
          width: 100%;
          min-height: 480px;
        }
        
        @media (max-device-width: 600px) {
          a[is="link-preview"] .preview {
            flex-direction: column;
          }      
          
          a[is="link-preview"] .preview .meta {
            flex: 0;
          }

          a[is="link-preview"] .preview .image {
            border-right: 0;
            border-bottom: 1px solid rgba(var(--main-link-highlighted-color-rgb), 0.1);
          }
        }
      </style>
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
              <div class="title">${linkPreview.title}</div>
              <div class="description">${linkPreview.description}</div>
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
