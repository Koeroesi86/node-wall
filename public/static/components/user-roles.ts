class UserRoles extends Component {
  declare list: HTMLElement;

  static override styleSheet = '/static/components/user-roles.css';

  connectedCallback() {
    this.innerHTML += `
      <div class="heading">
        <translate-text alias="user-roles.header"></translate-text>
      </div>
      <div class="list"></div>
    `;
    this.list = this.querySelector('.list');
    this.load();
  }

  send<T = unknown>(method: string, url: string, payload?: unknown) {
    return new Promise<T>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = () => {
        if (request.readyState !== 4) return;
        if (request.status >= 400) return reject(request);
        resolve(request.responseText ? JSON.parse(request.responseText) : undefined);
      };
      request.open(method, url, true);
      if (payload) request.setRequestHeader('Content-Type', 'application/json');
      request.send(payload ? JSON.stringify(payload) : undefined);
    });
  }

  load() {
    return this.send('GET', '/api/users')
      .then(users => ApiSchemas.UserListResponseSchema.parse(users))
      .then(users => {
        this.list.innerHTML = '';
        users.forEach(user => this.list.appendChild(this.renderUser(user)));
      })
      .catch(e => console.error(e));
  }

  renderUser(user: { id: string; name?: string; role: string }) {
    const isAdmin = user.role === 'admin';
    const row = document.createElement('div');
    row.classList.add('user');
    row.setAttribute('user-id', user.id);
    row.innerHTML = `
      <span class="name"></span>
      <span class="role"></span>
      <button type="button" class="button toggle">
        <translate-text alias="user-roles.${isAdmin ? 'demote' : 'promote'}"></translate-text>
      </button>
    `;
    row.querySelector('.name').textContent = user.name || user.id;
    row.querySelector('.role').textContent = user.role;
    row.querySelector('.toggle').addEventListener('click', e => {
      e.preventDefault();
      this.send('PUT', `/api/users/${encodeURIComponent(user.id)}`, ApiSchemas.SetUserRoleRequestSchema.parse({ role: isAdmin ? 'user' : 'admin' }))
        .then(() => this.load())
        .catch(err => console.error(err));
    });

    return row;
  }
}

customElements.define('user-roles', UserRoles);
