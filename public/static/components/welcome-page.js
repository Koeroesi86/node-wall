class WelcomePage extends HTMLElement {
  static styleSheet = '/static/components/welcome-page.css';

  connectedCallback() {
    this.innerHTML += `
      ${window.hasStyleWrapper ? '' : `<style type="text/css">@import url('${WelcomePage.styleSheet}');</style>`}
      <div>
        <h3>Üdvözöllek.</h3>
        <div>
          A falat <a href="/wall">itt találod</a>
        </div>
      </div>
    `;
  }
}

window.customElements.define('welcome-page', WelcomePage);
