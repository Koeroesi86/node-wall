class NavigationWrapper extends Component {
  static styleSheet = '/static/components/navigation-wrapper.css';

  onStyleSheetLoaded() {
    this.style.display = '';
  }

  connectedCallback() {
    this.style.display = 'none';
    this.innerHTML += `
      <a href="/" title="Főoldal">
        <i class="fas fa-home"></i>
        <span>Főoldal</span>
      </a>
      <a href="/wall" title="Fal">
        <i class="far fa-comment"></i>
        <span>Fal</span>
      </a>
      <div class="user"></div>
      <div class="bottom">
        <a href="javascript:void(0)" class="darkThemeToggle" title="Világos/sötét sablon váltása"></a>
        <a href="javascript:void(0)" class="menuToggle" title="Menü összecsukása">
          <i class="fa fa-bars" aria-hidden="true"></i>
          <span>Menü</span>
        </a>
      </div>
    `;

    this.userPanel = this.querySelector('.user');

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
                    <a href="/moderation">
                      <i class="fas fa-dungeon"></i>
                      <span>Moderáció</span>
                    </a>
                  `}
                  <a href="/profile" title="Bejelentkezve mint ${userName}" class="userNameWrapper">
                    <i class="far fa-user"></i>
                    <span>
                      ${userName}
                    </span>
                    </div>
                  </a>
                `;
              } else if (userInfo.session.status === 'pending') {
                if (window.location.pathname !== '/login') {
                  window.location.replace(`/login?session=${userInfo.session.id}`);
                }
                this.userPanel.innerHTML = `
                <a href="/login?session=${userInfo.session.id}" title="Bejelentkezés véglegesítése" class="login">
                  <i class="far fa-user"></i>
                  <span>Bejelentkezés</span>
                </a>
              `;
              }

              this.userPanel.innerHTML += `
              <a href="/logout">
                <i class="fas fa-sign-out-alt"></i>
                <span>Kijelentkezés</span>
              </a>
            `;
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
          <span>Bejelentkezés</span>
        </a>
      `;
    }
  }

  updateTheme() {
    if (localStorage.getItem('darkTheme') !== 'on') {
      document.body.classList.remove('darkTheme');
      this.darkThemeToggle.innerHTML = `
        <i class="fa fa-moon-o" aria-hidden="true"></i>
        <span>Sötét</span>
      `;
    } else {
      document.body.classList.add('darkTheme');
      this.darkThemeToggle.innerHTML = `
        <i class="fa fa-sun-o" aria-hidden="true"></i>
        <span>Világos</span>
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
