class NavigationWrapper extends Component {
  static styleSheet = '/static/components/navigation-wrapper.css';

  onStyleSheetLoaded() {
    this.style.display = '';
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
    this.updateTheme();

    TranslateText.getTranslation('navigation-wrapper.home')
      .then(translation => this.homeLink.setAttribute('title', translation.value));
    TranslateText.getTranslation('navigation-wrapper.wall')
      .then(translation => this.wallLink.setAttribute('title', translation.value));
    TranslateText.getTranslation('navigation-wrapper.menu.collapse-toggle')
      .then(translation => this.menuToggle.setAttribute('title', translation.value));
    TranslateText.getTranslation('navigation-wrapper.toggle-theme')
      .then(translation => this.darkThemeToggle.setAttribute('title', translation.value));

    const sessionId = this.getAttribute('session-id');
    if (sessionId) {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const userInfo = JSON.parse(request.responseText);
            if (userInfo.user) {
              const userName = userInfo.user.name ? userInfo.user.name : 'Névtelen idegen';
              this.userPanel.classList.remove('hidden');

              if (userInfo.session.status === 'active') {
                this.userPanel.innerHTML += `
                  ${userInfo.user.role !== 'admin' ? '' : `
                    <a href="/moderation" class="moderation">
                      <i class="fas fa-dungeon"></i>
                      <span><translate-text alias="navigation-wrapper.moderation"></translate-text></span>
                    </a>
                  `}
                  <a href="/profile" class="userNameWrapper">
                    <i class="far fa-user"></i>
                    <span>
                      ${userName}
                    </span>
                    </div>
                  </a>
                `;

                TranslateText.getTranslation('navigation-wrapper.user.logged-in-as')
                  .then(translation => {
                    this.userPanel.querySelector('.userNameWrapper').setAttribute('title', `${translation.value}`.replace('%USERNAME%', userName));
                  });
                TranslateText.getTranslation('navigation-wrapper.moderation')
                  .then(translation => {
                    this.userPanel.querySelector('.moderation').setAttribute('title', translation.value);
                  });
              } else if (userInfo.session.status === 'pending') {
                if (window.location.pathname !== '/login') {
                  window.location.replace(`/login?session=${userInfo.session.id}`);
                }
                this.userPanel.innerHTML = `
                  <a href="/login?session=${userInfo.session.id}" class="login">
                    <i class="far fa-user"></i>
                    <span><translate-text alias="navigation-wrapper.login"></translate-text></span>
                  </a>
                `;
                TranslateText.getTranslation('navigation-wrapper.login.title')
                  .then(translation => {
                    this.userPanel.querySelector('.login').setAttribute('title', translation.value);
                  });
              }

              this.userPanel.innerHTML += `
                <a href="/logout" class="logout">
                  <i class="fas fa-sign-out-alt"></i>
                  <span><translate-text alias="navigation-wrapper.logout"></translate-text></span>
                </a>
              `;
              TranslateText.getTranslation('navigation-wrapper.logout')
                .then(translation => {
                  this.userPanel.querySelector('.logout').setAttribute('title', translation.value);
                });
            }
          }

          if (request.status === 401) {

          }

          const currentUrlLink = this.querySelector(`a[href^="${window.location.pathname}"]`);
          if (currentUrlLink) {
            currentUrlLink.classList.add('current')
          }
        }
      };
      request.open("GET", "/api/user", true);
      request.send();
    } else {
      this.userPanel.innerHTML = `
        <a href="/login" title="Bejelentkezés" class="login">
          <i class="far fa-user"></i>
          <span><translate-text alias="navigation-wrapper.login"></translate-text></span>
        </a>
      `;
      TranslateText.getTranslation('navigation-wrapper.login')
        .then(translation => {
          this.userPanel.querySelector('.login').setAttribute('title', translation.value);
        });
    }
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

  renameUser(name) {
    if (name && name.length > 0) {
      const request = new XMLHttpRequest();
      request.onreadystatechange  = e => {
        if (request.readyState === 4 && request.status === 200) {
          window.location.reload();
        }
      };
      request.open("PUT", "/api/user/name", true);
      request.setRequestHeader('Content-Type', 'application/json');
      request.send(JSON.stringify({ name: name }));
    }
  }
}

window.customElements.define('navigation-wrapper', NavigationWrapper);
