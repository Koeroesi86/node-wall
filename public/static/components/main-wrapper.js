class MainWrapper extends HTMLElement {
  static styleSheet = '/static/components/main-wrapper.css';

  connectedCallback() {
    this.innerHTML += `
      ${window.hasStyleWrapper ? '' : `<style type="text/css">@import url('${MainWrapper.styleSheet}');</style>`}
    `;
  }
}

window.customElements.define('main-wrapper', MainWrapper);
