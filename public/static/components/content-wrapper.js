class ContentWrapper extends HTMLElement {
  static styleSheet = '/static/components/content-wrapper.css';

  connectedCallback() {
    this.innerHTML += `
      ${window.hasStyleWrapper ? '' : `<style type="text/css">@import url('${ContentWrapper.styleSheet}');</style>`}
    `;
  }
}

window.customElements.define('content-wrapper', ContentWrapper);
