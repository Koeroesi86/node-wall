class WelcomePage extends Component {
  static styleSheet = '/static/components/welcome-page.css';

  connectedCallback() {
    this.innerHTML += `
      <div>
        <h3><translate-text alias="welcome-page.header"></translate-text></h3>
        <div>
          <translate-text alias="welcome-page.note"></translate-text>
        </div>
      </div>
    `;
  }
}

window.customElements.define('welcome-page', WelcomePage);
