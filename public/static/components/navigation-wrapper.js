function hasTranslationChanged(state, alias, previous) {
  return state.translations[alias] !== undefined && state.translations[alias] !== previous;
}

class NavigationWrapper extends Component {
  static styleSheet = '/static/components/navigation-wrapper.css';
  constructor() {
    super();

    this._texts = {
      unknownUser: '',
      loggedInAs: '',
      moderation: '',
      loginTitle: '',
      logout: '',
      home: '',
      wall: '',
      menuToggle: '',
      darkThemeToggle: '',
    };
    this._userName = '';
    this._receivedUser = false;
    this._dispatch = () => {};

    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
    this.renderUser = this.renderUser.bind(this);
    this.renderTranslations = this.renderTranslations.bind(this);
  }

  onStyleSheetLoaded() {
    this.style.display = '';
  }

  mapState(state) {
    let translationChanged = false;
    if (hasTranslationChanged(state, 'post-preview.unknown-user', this._texts.unknownUser)) {
      this._texts.unknownUser = state.translations['post-preview.unknown-user'];
      translationChanged = true;
    }
    if (hasTranslationChanged(state, 'navigation-wrapper.user.logged-in-as', this._texts.loggedInAs)) {
      this._texts.loggedInAs = state.translations['navigation-wrapper.user.logged-in-as'];
      translationChanged = true;
    }
    if (hasTranslationChanged(state, 'navigation-wrapper.moderation', this._texts.moderation)) {
      this._texts.moderation = state.translations['navigation-wrapper.moderation'];
      translationChanged = true;
    }
    if (hasTranslationChanged(state, 'navigation-wrapper.login.title', this._texts.loginTitle)) {
      this._texts.loginTitle = state.translations['navigation-wrapper.login.title'];
      translationChanged = true;
    }
    if (hasTranslationChanged(state, 'navigation-wrapper.logout', this._texts.logout)) {
      this._texts.logout = state.translations['navigation-wrapper.logout'];
      translationChanged = true;
    }
    if (hasTranslationChanged(state, 'navigation-wrapper.home', this._texts.home)) {
      this._texts.home = state.translations['navigation-wrapper.home'];
      translationChanged = true;
    }
    if (hasTranslationChanged(state, 'navigation-wrapper.wall', this._texts.wall)) {
      this._texts.wall = state.translations['navigation-wrapper.wall'];
      translationChanged = true;
    }
    if (hasTranslationChanged(state, 'navigation-wrapper.menu.collapse-toggle', this._texts.menuToggle)) {
      this._texts.menuToggle = state.translations['navigation-wrapper.menu.collapse-toggle'];
      translationChanged = true;
    }
    if (hasTranslationChanged(state, 'navigation-wrapper.toggle-theme', this._texts.darkThemeToggle)) {
      this._texts.darkThemeToggle = state.translations['navigation-wrapper.toggle-theme'];
      translationChanged = true;
    }

    if (translationChanged) {
      this.renderTranslations();
    }

    if (state.user.received && !this._receivedUser) {
      this._receivedUser = true;
      this._userName = state.user.name ? state.user.name : this._texts.unknownUser;
      this.renderUser(state.user);
      this.renderTranslations();
    }
  }

  mapDispatch(dispatch) {
    this._dispatch = dispatch;
  }

  renderTranslations() {
    const userNameWrapper = this.userPanel.querySelector('.userNameWrapper');
    if (userNameWrapper) userNameWrapper.setAttribute('title', this._texts.loggedInAs.replace('%USERNAME%', this._userName));

    const moderation = this.userPanel.querySelector('.moderation');
    if (moderation) moderation.setAttribute('title', this._texts.moderation);

    const login = this.userPanel.querySelector('.login');
    if (login) login.setAttribute('title', this._texts.loginTitle);

    const logout = this.userPanel.querySelector('.logout');
    if (logout) logout.setAttribute('title', this._texts.logout);

    this.homeLink.setAttribute('title', this._texts.home);
    this.wallLink.setAttribute('title', this._texts.wall);
    this.menuToggle.setAttribute('title', this._texts.menuToggle);
    this.darkThemeToggle.setAttribute('title', this._texts.darkThemeToggle);
  }

  renderUser(userInfo) {
    if (userInfo.session) {
      this.userPanel.classList.remove('hidden');

      if (userInfo.session.status === 'active') {
        this.userPanel.innerHTML = `
          ${userInfo.role !== 'admin' ? '' : `
            <a href="/moderation" class="moderation">
              <i class="fas fa-dungeon"></i>
              <span><translate-text alias="navigation-wrapper.moderation"></translate-text></span>
            </a>
          `}
          <a href="/profile" class="userNameWrapper">
            <i class="far fa-user"></i>
            <span>
              ${this._userName}
            </span>
            </div>
          </a>
        `;
      } else if (userInfo.session.status === 'pending') {
        if (location.pathname !== '/login') {
          location.replace(`/login?session=${userInfo.session.id}`);
        }
        this.userPanel.innerHTML = `
          <a href="/login?session=${userInfo.session.id}" class="login">
            <i class="far fa-user"></i>
            <span><translate-text alias="navigation-wrapper.login"></translate-text></span>
          </a>
        `;
      }

      this.userPanel.innerHTML += `
        <a href="/logout" class="logout">
          <i class="fas fa-sign-out-alt"></i>
          <span><translate-text alias="navigation-wrapper.logout"></translate-text></span>
        </a>
      `;
    } else {
      this.userPanel.innerHTML = `
        <a href="/login" title="Bejelentkezés" class="login">
          <i class="far fa-user"></i>
          <span><translate-text alias="navigation-wrapper.login"></translate-text></span>
        </a>
      `;
    }
  }

  connectedCallback() {
    this.style.display = 'none';
    this.innerHTML += `
      <a href="/" class="home">
        <i class="fas fa-home"></i>
        <span><translate-text alias="navigation-wrapper.home"></translate-text></span>
      </a>
      <a href="/wall" class="wall">
        <i class="far fa-comment"></i>
        <span><translate-text alias="navigation-wrapper.wall"></translate-text></span>
      </a>
      <div class="user"></div>
      <div class="bottom">
        <a href="javascript:void(0)" class="darkThemeToggle"></a>
        <a href="javascript:void(0)" class="menuToggle">
          <i class="fa fa-bars" aria-hidden="true"></i>
          <span><translate-text alias="navigation-wrapper.menu"></translate-text></span>
        </a>
      </div>
    `;

    this.userPanel = this.querySelector('.user');
    this.homeLink = this.querySelector('.home');
    this.wallLink = this.querySelector('.wall');

    this.menuToggle = this.querySelector('.bottom .menuToggle');
    this.menuToggle.addEventListener('click', e => {
      e.preventDefault();
      localStorage.setItem('collapsedMenu', localStorage.getItem('collapsedMenu') === 'on' ? 'off' : 'on');
      this.updateMenu();
    });
    this.updateMenu();

    this.darkThemeToggle = this.querySelector('.bottom .darkThemeToggle');
    this.darkThemeToggle.addEventListener('click', e => {
      e.preventDefault();
      localStorage.setItem('darkTheme', localStorage.getItem('darkTheme') === 'on' ? 'off' : 'on');
      this.updateTheme();
    });

    connectRedux(this.mapState, this.mapDispatch);

    this._dispatch(translationsActions.request('post-preview.unknown-user'));
    this._dispatch(translationsActions.request('navigation-wrapper.user.logged-in-as'));
    this._dispatch(translationsActions.request('navigation-wrapper.moderation'));
    this._dispatch(translationsActions.request('navigation-wrapper.login.title'));
    this._dispatch(translationsActions.request('navigation-wrapper.logout'));
    this._dispatch(translationsActions.request('navigation-wrapper.home'));
    this._dispatch(translationsActions.request('navigation-wrapper.wall'));
    this._dispatch(translationsActions.request('navigation-wrapper.menu.collapse-toggle'));
    this._dispatch(translationsActions.request('navigation-wrapper.toggle-theme'));

    if (this.getAttribute('session-id')) {
      this._dispatch(userActions.request());
    }

    this.updateTheme();
  }

  updateTheme() {
    if (localStorage.getItem('darkTheme') !== 'on') {
      document.body.classList.remove('darkTheme');
      this.darkThemeToggle.innerHTML = `
        <i class="fa fa-moon-o" aria-hidden="true"></i>
        <span><translate-text alias="navigation-wrapper.theme.dark"></translate-text></span>
      `;
    } else {
      document.body.classList.add('darkTheme');
      this.darkThemeToggle.innerHTML = `
        <i class="fa fa-sun-o" aria-hidden="true"></i>
        <span><translate-text alias="navigation-wrapper.theme.bright"></translate-text></span>
      `;
    }
  }

  updateMenu() {
    if (localStorage.getItem('collapsedMenu') === 'on') {
      this.classList.add('collapsed');
    } else {
      this.classList.remove('collapsed');
    }
  }
}

customElements.define('navigation-wrapper', NavigationWrapper);
