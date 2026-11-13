class PrivacyPage extends Component {
  static override styleSheet = '/static/components/privacy-page.css';

  connectedCallback() {
    const controller = this.getAttribute('controller') ?? '';
    const contact = this.getAttribute('contact') ?? '';
    const sections = ['controller', 'data', 'purposes', 'retention', 'recipients', 'cookies', 'rights', 'complaint']
      .map(section => `<section><translate-text alias="privacy-page.${section}"></translate-text></section>`)
      .join('');

    this.innerHTML += `
      <h3><translate-text alias="privacy-page.header"></translate-text></h3>
      <p><translate-text alias="privacy-page.intro"></translate-text></p>
      ${sections}
      <section>
        <translate-text alias="privacy-page.contact"></translate-text>
        <div class="controller"></div>
        <div><a class="contact"></a></div>
      </section>
    `;

    // Operator supplied values go in through the DOM so they are never parsed as HTML.
    this.querySelector('.controller').textContent = controller;
    const link = this.querySelector('.contact');
    link.textContent = contact;
    if (contact) link.setAttribute('href', `mailto:${encodeURI(contact)}`);
  }
}

customElements.define('privacy-page', PrivacyPage);
