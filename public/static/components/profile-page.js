class ProfilePage extends Component {
  static styleSheet = '/static/components/profile-page.css';

  connectedCallback() {
    this.innerHTML = `
      <h2><translate-text alias="profile-page.header"></translate-text></h2>
      <div class="renameUserWrapper">
        <input type="text" value="" name="name" class="name" />
        <button type="button" class="button">
          <translate-text alias="profile-page.rename.button"></translate-text>
        </button>
      </div>
      <div class="sessionListWrapper">
        <h3><translate-text alias="profile-page.session-list.header"></translate-text></h3>
        <div class="sessionList"></div>
      </div>
    `;

    const renameUserWrapper = this.querySelector('.renameUserWrapper');
    this.renameInput = renameUserWrapper.querySelector('.name');
    this.sessionList = this.querySelector('.sessionList');

    TranslateText.getTranslation('profile-page.rename.input.placeholder')
      .then(translation => {
        this.renameInput.setAttribute('placeholder', translation.value)
      });
    TranslateText.getTranslation('profile-page.rename.input.title')
      .then(translation => {
        this.renameInput.setAttribute('title', translation.value)
      });

    renameUserWrapper.querySelector('.button').addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();

      this.renameUser(this.renameInput.value);
    });

    Promise.resolve()
      .then(() => this.getUserInfo())
      .then(() => this.parseUserSessions())
      .catch(e => console.error(e))
  }

  parseUserSessions() {
    const sessionId = this.getAttribute('session-id');

    const parseSessionStatus = sessionStatus => {
      switch (sessionStatus) {
        case 'active':
          return 'active';
        case 'pending':
        default:
          return 'pending';
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

    return Promise.resolve()
      .then(() => this.getUserSessions())
      .then(sessions => {
        this.sessionList.innerHTML = sessions.map(session => `
          <div class="session ${isCurrentSession(session.sessionId) ? 'current' : ''}" title="${session.details ? session.details.userAgent : ''}">
            <div class="type">
              ${parseLoginType(session.loginType)}
            </div>
            <div class="meta">
              <translate-text alias="profile-page.session-list.session.status.${parseSessionStatus(session.sessionStatus)}"></translate-text>
              &nbsp;&middot;&nbsp;
              <translate-text alias="profile-page.session-list.session.created-at"></translate-text>&nbsp;${new Date(session.sessionCreatedAt).toLocaleString()}
              ${session.lastActive ? `&nbsp;&middot;&nbsp;
                <translate-text alias="profile-page.session-list.session.last-active"></translate-text>&nbsp;
                ${new Date(session.lastActive).toLocaleString()}
              ` : ''}
              ${isCurrentSession(session.sessionId) ? '&nbsp;&middot;&nbsp;<translate-text alias="profile-page.session-list.session.current"></translate-text>' : ''}
            </div>
            <div class="actionsWrapper">
              <button type="button" class="exit" data-session-id="${session.sessionId}">
                <i class="fa fa-times" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        `).join('');

        TranslateText.getTranslation('profile-page.session.action.exit')
          .then(translation => {
            this.sessionList.querySelectorAll('.actionsWrapper .exit').forEach(exitButton => {
              exitButton.setAttribute('title', translation.value);
            });
          });

        this.sessionList.querySelectorAll('.session .actionsWrapper .exit').forEach(exitButton => {
          exitButton.addEventListener('click', e => {
            e.preventDefault();
            if (isCurrentSession(exitButton.dataset.sessionId)) {
              TranslateText.getTranslation('profile-page.session-list.session.current.exit-alert')
                .then(translation => {
                  alert(translation.value);
                });
            } else {
              Promise.resolve()
                .then(() => this.deleteSession(exitButton.dataset.sessionId))
                .then(() => exitButton.closest('.session').remove())
            }
          });
        });
      });
  }

  deleteSession(sessionId = 'uuid') {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = () => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            resolve();
          } else {
            reject();
          }
        }
      };
      request.open('DELETE', `/api/user/sessions/${sessionId}`, true);
      request.send();
    });
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
