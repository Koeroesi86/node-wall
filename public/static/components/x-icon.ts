class Icon extends Component {
  static override styleSheet = '/static/components/x-icon.css';
  static iconSet = {
    'moderation': '<i class="fas fa-dungeon"></i>',
    'user': '<i class="far fa-user"></i>',
    'logout': '<i class="fas fa-sign-out-alt"></i>',
    'home': '<i class="fas fa-home"></i>',
    'wall': '<i class="far fa-comment"></i>',
    'menuToggle': '<i class="fa fa-bars" aria-hidden="true"></i>',
    'darkTheme': '<i class="fa fa-moon-o" aria-hidden="true"></i>',
    'lightTheme': '<i class="fa fa-sun-o" aria-hidden="true"></i>',
    'likeTag': '<i class="fas fa-folder-plus"></i>',
    'dislikeTag': '<i class="fas fa-ban"></i>',
    'emailLogin': '<i class="fa fa-envelope-o" aria-hidden="true"></i>',
    'exit': '<i class="fa fa-times" aria-hidden="true"></i>',
    'sentDate': '<i class="far fa-calendar-alt"></i>',
  };

  static get observedAttributes() { return ['type']; }

  render() {
    const type = this.getAttribute('type');
    this.innerHTML = Icon.iconSet[type] || '';
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name) {
    if (name === 'type') {
      this.render();
    }
  }
}

customElements.define('x-icon', Icon);
