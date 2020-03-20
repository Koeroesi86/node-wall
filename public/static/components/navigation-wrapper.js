class NavigationWrapper extends HTMLElement {
  connectedCallback() {
    this.innerHTML += `
      <style type="text/css">
        navigation-wrapper {
          display: flex;
          flex-direction: column;
          width: 200px;
          transition: width .2s ease-in-out;
        }
        
        navigation-wrapper .user,
        navigation-wrapper a,
        navigation-wrapper a:visited {
          display: flex;
          flex-direction: row;
          align-items: center;
          line-height: 35px;
          height: 35px;
          padding: 0 12px;
          font-size: 14px;
          color: var(--main-text-color);
          text-decoration: none;
          text-align: left;
          transition: all .2s ease-in-out;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
        }
        
        navigation-wrapper a {
          color: rgba(var(--main-link-color-rgb), .6);
        }
        
        navigation-wrapper a:hover,
        navigation-wrapper a:active,
        navigation-wrapper a:focus,
        navigation-wrapper a.current{
          color: rgba(var(--main-link-highlighted-color-rgb), 1);
          cursor: pointer;
          outline: 0;
        }
        
        navigation-wrapper .user span,
        navigation-wrapper a span {
          padding-left: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        navigation-wrapper .user {
          padding: 0;
          display: block;
          height: auto;
          overflow: visible;
        }
        
        navigation-wrapper .userNameWrapper {
          position: relative;
          overflow: visible;
        }
        
        navigation-wrapper .renameUserWrapper {
          position: absolute;
          left: 100%;
          top: 0;
          height: 100%;
          background: var(--tooltip-background-color);
          padding: 3px 6px;
          z-index: 999;
        }
        
        navigation-wrapper .renameUserWrapper.hidden {
          display: none;
        }
        
        navigation-wrapper .renameUserWrapper {
          display: flex;
          flex-direction: row;
          align-items: center;
        }
        
        navigation-wrapper .renameUserWrapper .name {
          display: inline-block;
          margin: 0;
          padding: 0 6px;
          line-height: 35px;
          height: 35px;
          font-size: 12px;
          border: 1px solid var(--tooltip-border-color);
          border-right: 0;
          background: transparent;
          border-radius: 0;
          border-top-left-radius: 6px;
          border-bottom-left-radius: 6px;
          color: #fff;
        }
        
        navigation-wrapper .renameUserWrapper .button {
          display: inline-block;
          margin: 0;
          padding: 0 6px;
          line-height: 35px;
          height: 35px;
          font-size: 12px;
          border: 1px solid var(--tooltip-button-border-color);
          background: rgba(var(--tooltip-button-background-color-rgb), 0.05);
          border-radius: 0;
          border-top-right-radius: 6px;
          border-bottom-right-radius: 6px;
          color: #fff;
          cursor: pointer;
          transition: all .2s ease-in-out;
        }
        
        navigation-wrapper .renameUserWrapper .button:hover {
          background: rgba(var(--tooltip-button-background-color-rgb), 0.2);
        }
        
        navigation-wrapper .bottom {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        
        navigation-wrapper .bottom a {
          min-width: 100%;
        }
        
        navigation-wrapper.collapsed {
          width: 40px;
        }
        
        navigation-wrapper.collapsed a {
          height: 35px;
        }
        
        navigation-wrapper.collapsed .user span,
        navigation-wrapper.collapsed a span {
          display: none;
        }
        
        @media (max-device-width: 480px) {
          navigation-wrapper {
            width: 40px;
          }

          navigation-wrapper .user span,
          navigation-wrapper a span {
            display: none;
            height: 0;
          }
          
          navigation-wrapper .bottom .menuToggle {
            display: none;
          }
        }
        
        @media (min-device-width: 1024px) {
          navigation-wrapper a {
            line-height: 45px;
            height: 45px;
          }
        }
      </style>
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
        <a href="javascript:void(0)" class="darkThemeToggle"></a>
        <a href="javascript:void(0)" class="menuToggle">
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

    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4) {
        if (request.status === 200) {
          const userInfo = JSON.parse(request.responseText);
          if (userInfo.user) {
            const userName = userInfo.user.name ? userInfo.user.name : 'Névtelen idegen';
            this.userPanel.classList.remove('hidden');

            if (userInfo.session.status === 'active') {
              if (userInfo.user.role === 'admin') {
                this.userPanel.innerHTML += `
                <a href="/moderation">
                  <i class="fas fa-dungeon"></i>
                  <span>Moderáció</span>
                </a>
              `;
              }

              this.userPanel.innerHTML += `
                <a title="Bejelentkezve mint ${userName}" class="userNameWrapper" tabindex="0">
                  <i class="far fa-user"></i>
                  <span>
                    ${userName}
                  </span>
                  <div class="renameUserWrapper hidden" tabindex="0">
                    <input type="text" value="${userInfo.user.name || ''}" name="name" class="name" placeholder="Megjelenítendő név" />
                    <button type="button" class="button">
                      Mentés
                    </button>
                  </div>
                </a>
              `;

              setTimeout(() => {
                const userNameWrapper = this.userPanel.querySelector('.userNameWrapper');
                const renameUserWrapper = this.userPanel.querySelector('.renameUserWrapper');
                const renameInput = renameUserWrapper.querySelector('.name');
                userNameWrapper.addEventListener('click', e => {
                  e.stopPropagation();
                  e.preventDefault();

                  renameUserWrapper.classList.toggle('hidden');
                });
                userNameWrapper.addEventListener('focusout', e => {
                  e.stopPropagation();
                  e.preventDefault();

                  if (userNameWrapper !== e.relatedTarget && !userNameWrapper.contains(e.relatedTarget)) {
                    renameUserWrapper.classList.add('hidden');
                  }
                }, false);
                renameUserWrapper.addEventListener('click', e => {
                  e.stopPropagation();
                  e.preventDefault();
                });
                renameUserWrapper.querySelector('.button').addEventListener('click', e => {
                  e.stopPropagation();
                  e.preventDefault();

                  this.renameUser(renameInput.value);
                });
              }, 10);
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
          this.userPanel.innerHTML = `
            <a href="/login" title="Bejelentkezés" class="login">
              <i class="far fa-user"></i>
              <span>Bejelentkezés</span>
            </a>
          `;
        }

        const currentUrlLink = this.querySelector(`a[href^="${window.location.pathname}"]`);
        if (currentUrlLink) {
          currentUrlLink.classList.add('current')
        }
      }
    };
    request.open("GET", "/api/user", true);
    request.send();
  }

  updateTheme() {
    if (localStorage.getItem('darkTheme') === 'on') {
      document.body.classList.add('darkTheme');
      this.darkThemeToggle.innerHTML = `
        <i class="fa fa-moon-o" aria-hidden="true"></i>
        <span>Sötét</span>
      `;
    } else {
      document.body.classList.remove('darkTheme');
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
