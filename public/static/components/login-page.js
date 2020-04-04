class LoginPage extends HTMLElement {
  static styleSheet = '/static/components/login-page.css';

  connectedCallback() {
    this.innerHTML += `
      ${window.hasStyleWrapper ? '' : `<style type="text/css">@import url('${LoginPage.styleSheet}');</style>`}
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
