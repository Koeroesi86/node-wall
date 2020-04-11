class ProfilePage extends Component {
  static styleSheet = '/static/components/profile-page.css';

  connectedCallback() {
    const sessionId = this.getAttribute('session-id');

    this.innerHTML = `
      <h2>Profil</h2>
      <div class="renameUserWrapper">
        <input type="text" value="" name="name" class="name" placeholder="Megjelenítendő név" title="Megjelenítendő név" />
        <button type="button" class="button">
          Mentés
        </button>
      </div>
      <div class="sessionListWrapper">
        <h3>Bejelentkezések</h3>
        <div class="sessionList"></div>
      </div>
    `;

    const renameUserWrapper = this.querySelector('.renameUserWrapper');
    this.renameInput = renameUserWrapper.querySelector('.name');
    this.sessionList = this.querySelector('.sessionList');

    renameUserWrapper.querySelector('.button').addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();

      this.renameUser(this.renameInput.value);
    });

    const parseSessionStatus = sessionStatus => {
      switch (sessionStatus) {
        case 'active':
          return 'Aktív';
        case 'pending':
        default:
          return 'Függőben';
      }
    };

    const parseLoginType = loginType => {
      switch (loginType) {
        case 'email':
          return '<i class="fa fa-envelope-o" aria-hidden="true"></i>';
        default:
          return loginType;
      }
    };

    const isCurrentSession = sId => sId === sessionId;

    Promise.resolve()
      .then(() => this.getUserInfo())
      .then(() => this.getUserSessions())
      .then(sessions => {
        const resultHTML = sessions.map(session => `
          <div class="session ${isCurrentSession(session.sessionId) ? 'current' : ''}">
            <div class="type">
              ${parseLoginType(session.loginType)}
            </div>
            <div class="meta">
              ${parseSessionStatus(session.sessionStatus)} &middot; ${new Date(session.sessionCreatedAt).toLocaleString()}
              ${isCurrentSession(session.sessionId) ? '&middot; jelenlegi' : ''}
            </div>
          </div>
        `).join('');

        this.sessionList.innerHTML = resultHTML;
      })
      .catch(e => console.error(e))
  }

  getUserInfo() {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const userInfo = JSON.parse(request.responseText);
            if (userInfo.user) {
              this.renameInput.value = userInfo.user.name || '';
              resolve(userInfo);
            }
          }
          reject();
        }
      };
      request.open("GET", "/api/user", true);
      request.send();
    })
  }

  getUserSessions() {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const sessions = JSON.parse(request.responseText);
            resolve(sessions);
          }
          reject();
        }
      };
      request.open("GET", "/api/user/sessions", true);
      request.send();
    })
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

window.customElements.define('profile-page', ProfilePage);
