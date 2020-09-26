function hasTranslationChanged(state, alias, previous) {
  return state.translations[alias] !== undefined && state.translations[alias] !== previous;
}

class LoginPage extends Component {
  static styleSheet = '/static/components/login-page.css';

  constructor() {
    super();

    this._dispatch = () => {};
    this._texts = {
      activateSessionPlaceholder: '',
      createSessionPlaceholder: '',
    };

    this.render = this.render.bind(this);
    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
  }

  mapState(state) {
    if (hasTranslationChanged(state, 'login-page.activate-session.input.placeholder', this._texts.activateSessionPlaceholder)) {
      const activateSessionInput = this.activateSession.querySelector('.input');
      activateSessionInput.setAttribute('placeholder', state.translations['login-page.activate-session.input.placeholder']);
    }

    if (hasTranslationChanged(state, 'login-page.create-session.input.placeholder', this._texts.createSessionPlaceholder)) {
      const emailInput = this.createSession.querySelector('.input');
      emailInput.setAttribute('placeholder', state.translations['login-page.create-session.input.placeholder']);
    }
  }

  mapDispatch(dispatch) {
    this._dispatch = dispatch;
  }

  render() {

  }

  connectedCallback() {
    connectRedux(this.mapState, this.mapDispatch);
    this._dispatch(translationsActions.request('login-page.activate-session.input.placeholder'));
    this._dispatch(translationsActions.request('login-page.create-session.input.placeholder'));

    this.innerHTML += `
      <div class="activateSession hidden">
        <h3>
          <translate-text alias="login-page.activate-session.header"></translate-text>
        </h3>
        <div class="note">
          <translate-text alias="login-page.activate-session.note"></translate-text>
        </div>
        <form class="inline">
          <input type="text" maxlength="6" class="input" />
          <button type="submit" class="button">
            <translate-text alias="login-page.activate-session.button"></translate-text>
          </button>
        </form>
      </div>
      <div class="createSession hidden">
        <h3>
          <translate-text alias="login-page.create-session.header"></translate-text>
        </h3>
        <div class="note">
          <translate-text alias="login-page.create-session.header"></translate-text>
        </div>
        <form class="inline">
          <input type="email" class="input" name="email" />
          <button type="submit" class="button">
            <translate-text alias="login-page.create-session.button"></translate-text>
          </button>
          </form>
      </div>
    `;

    this.activateSession = this.querySelector('.activateSession');
    this.createSession = this.querySelector('.createSession');

    const activateSessionForm = this.activateSession.querySelector('form.inline');
    const createSessionForm = this.createSession.querySelector('form.inline');

    const currentUrl = new URL(location.toString());
    const sessionId = currentUrl.searchParams.get('session');
    if (sessionId) {
      this.activateSession.classList.remove('hidden');
      const activateSessionInput = this.activateSession.querySelector('.input');

      activateSessionForm.addEventListener('submit', e => {
        e.preventDefault();
        e.stopPropagation();
        if (activateSessionInput.value && activateSessionInput.value.length === 6 && /^[A-Z0-9]+$/.test(activateSessionInput.value)) {
          currentUrl.searchParams.set('code', activateSessionInput.value);
          currentUrl.pathname = '/login/email';
          location.href = currentUrl.toString();
        }
      });
    } else {
      this.createSession.classList.remove('hidden');
      const emailInput = this.createSession.querySelector('.input');

      createSessionForm.addEventListener('submit', e => {
        e.preventDefault();
        e.stopPropagation();
        const emailValue = emailInput.value;
        if (emailValue.length > 0 && (!emailValue.checkValidity || emailValue.checkValidity())) {
          const request = new XMLHttpRequest();
          request.onreadystatechange  = e => {
            if (request.readyState === 4 && request.status === 200) {
              const loginData = JSON.parse(request.responseText);
              location.href = `/login?session=${loginData.sessionId}`;
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
  }
}

customElements.define('login-page', LoginPage);
