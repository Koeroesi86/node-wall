class WelcomePage extends Component {
  static styleSheet = '/static/components/welcome-page.css';

  connectedCallback() {
    this.innerHTML += `
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
