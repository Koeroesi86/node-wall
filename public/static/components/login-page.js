class LoginPage extends Component {
  static styleSheet = '/static/components/login-page.css';

  connectedCallback() {
    let activateSessionPlaceholder;
    let createSessionPlaceholder;
    Promise.resolve()
      .then(() => TranslateText.getTranslation('login-page.activate-session.input.placeholder'))
      .then(translation => {
        activateSessionPlaceholder = translation.value;
        return Promise.resolve();
      })
      .then(() => TranslateText.getTranslation('login-page.create-session.input.placeholder'))
      .then(translation => {
        activateSessionPlaceholder = translation.value;
        return Promise.resolve();
      })
      .then(() => {
        this.innerHTML += `
          <div class="activateSession hidden">
            <h3>
              <translate-text alias="login-page.activate-session.header"></translate-text>
            </h3>
            <div class="note">
              <translate-text alias="login-page.activate-session.note"></translate-text>
            </div>
            <div class="inputGroup">
              <input type="text" maxlength="6" placeholder="${activateSessionPlaceholder}" class="input" />
              <button type="button" class="button">
                <translate-text alias="login-page.activate-session.note"></translate-text>
              </button>
            </div>
          </div>
          <div class="createSession hidden">
            <h3>
              <translate-text alias="login-page.create-session.header"></translate-text>
            </h3>
            <div class="note">
              <translate-text alias="login-page.create-session.header"></translate-text>
            </div>
            <div class="inputGroup">
              <input type="email" placeholder="${createSessionPlaceholder}" class="input" name="email" />
              <button type="button" class="button">
                <translate-text alias="login-page.create-session.button"></translate-text>
              </button>
            </div>
          </div>
        `;

        this.activateSession = this.querySelector('.activateSession');
        this.createSession = this.querySelector('.createSession');

        const currentUrl = new URL(window.location.toString());
        const sessionId = currentUrl.searchParams.get('session');
        if (sessionId) {
          this.activateSession.classList.remove('hidden');
          const activateSessionInput = this.activateSession.querySelector('.input');
          const activateSessionButton = this.activateSession.querySelector('.button');

          activateSessionButton.addEventListener('click', e => {
            if (activateSessionInput.value && activateSessionInput.value.length === 6 && /^[A-Z0-9]+$/.test(activateSessionInput.value)) {
              currentUrl.searchParams.set('code', activateSessionInput.value);
              currentUrl.pathname = '/login/email';
              window.location.href = currentUrl.toString();
            }
          });
        } else {
          this.createSession.classList.remove('hidden');
          const emailInput = this.createSession.querySelector('.input');
          const emailLoginButton = this.createSession.querySelector('.button');

          emailLoginButton.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const emailValue = emailInput.value;
            if (emailValue.length > 0 && (!emailValue.checkValidity || emailValue.checkValidity())) {
              const request = new XMLHttpRequest();
              request.onreadystatechange  = e => {
                if (request.readyState === 4 && request.status === 200) {
                  const loginData = JSON.parse(request.responseText);
                  window.location.replace(`/login?session=${loginData.sessionId}`);
                }
              };
              request.onerror = () => {
              };
              request.open("POST", "/api/user", true);
              request.setRequestHeader('Content-Type', 'application/json');
              request.send(JSON.stringify({
                type: 'email',
                value: emailValue
              }));
            }
          });
        }
      })
      .catch(console.error)
  }
}

window.customElements.define('login-page', LoginPage);
