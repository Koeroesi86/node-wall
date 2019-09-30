class LoginPage extends HTMLElement {
  connectedCallback() {
    this.innerHTML += `
      <style type="text/css">
        login-page {
          display: block;
          padding: 12px 20px;
        }
        
        login-page .activateSession.hidden,
        login-page .createSession.hidden {
          display: none;
        }
        
        login-page .note {
          font-size: 12px;
          margin: 6px 0;
        }
        
        login-page .note a {
          font-size: 12px;
          margin: 6px 0;
          color: inherit;
        }
        
        login-page .inputGroup {
          display: flex;
          flex-direction: row;
          align-items: center;
        }
        
        login-page .inputGroup .input {
          display: inline-block;
          margin: 0;
          padding: 0 6px;
          line-height: 35px;
          height: 35px;
          font-size: 12px;
          border: 1px solid #efefef;
          background: transparent;
          border-radius: 0;
          border-top-left-radius: 6px;
          border-bottom-left-radius: 6px;
          color: #fff;
        }
        
        login-page .inputGroup .button {
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
        
        login-page .inputGroup .button:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      </style>
      <div class="activateSession hidden">
        <h3>Aktiválás</h3>
        <div class="note">
          Kérlek add meg az aktiváló kódot amit e-mailben kaptál. Ellenőrizd a levélszemét mappában is, ha nem találod.<br />
          Amennyiben nem kaptál e-mailt <a href="/logout">kattints ide a kilépéshez</a>.
        </div>
        <div class="inputGroup">
          <input type="text" maxlength="6" placeholder="Belépő kód" class="input" />
          <button type="button" class="button">
            Aktiválás
          </button>
        </div>
      </div>
      <div class="createSession hidden">
        <h3>Bejelentkezés</h3>
        <div class="note">
          Kérlek add meg az e-mail címed a belépéshez.
        </div>
        <div class="inputGroup">
          <input type="email" placeholder="Email cím" class="input" name="email" />
          <button type="button" class="button">
            Bejelentkezés
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
  }
}

window.customElements.define('login-page', LoginPage);
