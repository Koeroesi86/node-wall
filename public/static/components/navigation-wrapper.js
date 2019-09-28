class NavigationWrapper extends HTMLElement {
  connectedCallback() {
    this.innerHTML += `
      <style type="text/css">
        navigation-wrapper {
          display: block;
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
          color: #efefef;
          text-decoration: none;
          text-align: left;
          transition: all .2s ease-in-out;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
        }
        
        navigation-wrapper a:hover,
        navigation-wrapper a:active,
        navigation-wrapper a:focus,
        navigation-wrapper a.current{
          color: #fff;
          background: rgba(255, 255, 255, .1);
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
          background: #333;
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
          border: 1px solid #efefef;
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
          border: 1px solid #efefef;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0;
          border-top-right-radius: 6px;
          border-bottom-right-radius: 6px;
          color: #fff;
          cursor: pointer;
          transition: all .2s ease-in-out;
        }
        
        navigation-wrapper .renameUserWrapper .button:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        @media (max-device-width: 480px) {
          navigation-wrapper .user span,
          navigation-wrapper a span {
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
    `;

    this.userPanel = this.querySelector('.user');

    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4) {
        if (request.status === 200) {
          const userInfo = JSON.parse(request.responseText);
          if (userInfo.user && userInfo.session.status === 'active') {
            const userName = userInfo.user.name ? userInfo.user.name : 'Névtelen idegen';

            this.userPanel.classList.remove('hidden');
            if (userInfo.user.role === 'admin') {
              this.userPanel.innerHTML += `
                <a href="/moderation">
                  <i class="fas fa-dungeon"></i>
                  <span>Moderáció</span>
                </a>
              `;
            }

            this.userPanel.innerHTML += `
              <a href="javascript:void(0);" title="Bejelentkezve mint ${userName}" class="userNameWrapper">
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
              <a href="/logout">
                <i class="fas fa-sign-out-alt"></i>
                <span>Kijelentkezés</span>
              </a>
            `;

            const currentUrlLink = this.querySelector(`a[href="${window.location.pathname}"]`);
            if (currentUrlLink) {
              currentUrlLink.classList.add('current')
            }

            const userNameWrapper = this.querySelector('.userNameWrapper');
            const renameUserWrapper = this.querySelector('.renameUserWrapper');
            userNameWrapper.addEventListener('click', e => {
              e.stopPropagation();
              e.preventDefault();

              renameUserWrapper.classList.toggle('hidden');
            });
            userNameWrapper.addEventListener('focusout', e => {
              if (!userNameWrapper.contains(e.relatedTarget)) {
                renameUserWrapper.classList.add('hidden');
              }
            }, false);
            renameUserWrapper.addEventListener('click', e => {
              e.stopPropagation();
              e.preventDefault();
            });
            const renameInput = renameUserWrapper.querySelector('.name');
            renameUserWrapper.querySelector('.button').addEventListener('click', e => {
              e.stopPropagation();
              e.preventDefault();

              this.renameUser(renameInput.value);
            });
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
      }
    };
    request.open("GET", "/api/user", true);
    request.send();
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
