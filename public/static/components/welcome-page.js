class WelcomePage extends HTMLElement {
  connectedCallback() {
    this.innerHTML += `
      <style type="text/css">
        welcome-page {
          text-align: center;
        }
        
        welcome-page a,
        welcome-page a:visited {
          color: #efefef;
          text-decoration: underline;
          transition: all .2s ease-in-out;
        }
        
        welcome-page a:hover,
        welcome-page a:active,
        welcome-page a:focus {
          color: #fff;
        }
      </style>
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
