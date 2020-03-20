class ContentWrapper extends HTMLElement {
  connectedCallback() {
    this.innerHTML += `
      <style type="text/css">
        content-wrapper {
          min-height: 100%;
          background-color: var(--content-wrapper-background-color);
          border-left: 1px solid var(--content-wrapper-border-color);
          color: var(--content-wrapper-text-color);
        }
      </style>
    `;
  }
}

window.customElements.define('content-wrapper', ContentWrapper);
