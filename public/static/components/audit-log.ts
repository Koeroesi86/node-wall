class AuditLog extends Component {
  declare list: HTMLElement;

  static override styleSheet = '/static/components/audit-log.css';

  connectedCallback() {
    this.innerHTML += `
      <div class="heading">
        <translate-text alias="audit-log.header"></translate-text>
      </div>
      <div class="list"></div>
    `;
    this.list = this.querySelector('.list');
    this.load();
  }

  fetchEntries() {
    return new Promise<unknown>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = () => {
        if (request.readyState !== 4) return;
        if (request.status >= 400) return reject(request);
        resolve(JSON.parse(request.responseText));
      };
      request.open('GET', '/api/users/audit', true);
      request.send();
    });
  }

  load() {
    return this.fetchEntries()
      .then(entries => ApiSchemas.AuditListResponseSchema.parse(entries))
      .then(entries => {
        this.list.innerHTML = entries.length ? '' : '<translate-text alias="audit-log.empty"></translate-text>';
        entries.forEach(entry => this.list.appendChild(this.renderEntry(entry)));
      })
      .catch(e => console.error(e));
  }

  renderEntry(entry: { user_id: string | null; user_name: string | null; action: string; target_id: string | null; created_at: number }) {
    const row = document.createElement('div');
    row.classList.add('entry');
    row.innerHTML = `
      <span class="time"></span>
      <span class="action"><translate-text></translate-text></span>
      <span class="actor"></span>
    `;
    row.querySelector('.time').textContent = new Date(entry.created_at).toLocaleString();
    row.querySelector('translate-text').setAttribute('alias', `audit-log.action.${entry.action}`);
    row.querySelector('.actor').textContent = entry.user_name || entry.user_id || '';
    row.querySelector('.actor').setAttribute('title', entry.target_id || '');

    return row;
  }
}

customElements.define('audit-log', AuditLog);
