class TagPage extends HTMLElement {
  connectedCallback() {
    const tagId = this.getAttribute('tag-id');
    const tagName = this.getAttribute('tag-name');

    // TODO: like/dislike tag
    this.innerHTML = `
      <style type="text/css">
        tag-page {
          display: flex;
          max-width: 100%;
          height: 100%;
          flex-direction: column;
        }
        
        tag-page h2 {
          padding: 12px 6px;
          margin: 0;
        }
        
        tag-page post-list {
          flex: 1 1;
        }
      </style>
      ${tagName ? `<h2>#${tagName}</h2>` : ''}
      <post-list liked-tags="${tagId || ''}"></post-list>
    `;
  }
}

window.customElements.define('tag-page', TagPage);
