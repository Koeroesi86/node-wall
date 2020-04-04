class TagPage extends HTMLElement {
  static styleSheet = '/static/components/tag-page.css';

  connectedCallback() {
    const tagId = this.getAttribute('tag-id');
    const tagName = this.getAttribute('tag-name');

    // TODO: like/dislike tag
    this.innerHTML = `
      ${window.hasStyleWrapper ? '' : `<style type="text/css">@import url('${TagPage.styleSheet}');</style>`}
      ${tagName ? `<h2>#${tagName}</h2>` : ''}
      <post-list liked-tags="${tagId || ''}"></post-list>
    `;
  }
}

window.customElements.define('tag-page', TagPage);
