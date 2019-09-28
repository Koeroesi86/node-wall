class ContentWrapper extends HTMLElement {
  connectedCallback() {
    this.innerHTML += `
      <style type="text/css">
        content-wrapper {
          min-height: 100%;
          background-color: #1f1f1f;
          border-left: 1px solid #333;
          color: #efefef;
        }
      </style>
    `;
  }
}

window.customElements.define('content-wrapper', ContentWrapper);
