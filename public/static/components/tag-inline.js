class TagInline extends Component {
  static styleSheet = '/static/components/tag-inline.css';

  static get observedAttributes() { return ['tag-id']; }

  constructor() {
    super();

    this._tag = null;
    this._dispatch = () => {};

    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
    this.requestTag = this.requestTag.bind(this);
    this.render = this.render.bind(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'tag-id' && this.isConnected) {
      this.requestTag();
    }
  }

  mapState(state) {
    const tagId = this.getAttribute('tag-id');
    const tag = state.tags[tagId];
    if (tagId && tag && tag !== this._tag) {
      this._tag = tag;
      this.render();
    }
  }

  mapDispatch(dispatch) {
    this._dispatch = dispatch;
  }

  requestTag() {
    const id = this.getAttribute('tag-id');
    this._dispatch(tagsActions.request(id));
  }

  render() {
    if (this._tag) {
      if (this._tag.type === 'text') {
        this._label.innerText = '#';
      }

      this._label.innerText += this._tag.name;
      // TODO: like/dislike tag
      this._tooltip.innerHTML = `
        <translate-text alias="tag-inline.tooltip.prefix"></translate-text>
        &nbsp;<a href="/tag/${this._tag.id}" target="_blank">${this._tag.name}</a>
      `;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', `/tag/${this._tag.id}`);
      linkElement.setAttribute('target', '_blank');
      this._label.addEventListener('click', e => {
        linkElement.click();
      });
    }
  }

  connectedCallback() {
    this.innerHTML += `
      <span class="label"></span>
      <div class="tooltip"></div>
    `;

    this._label = this.querySelector('.label');
    this._tooltip = this.querySelector('.tooltip');

    window.connectRedux(this.mapState, this.mapDispatch);
    this.requestTag();

    this.addEventListener('mouseover', e => {
      // if (this._tooltipTimer) clearTimeout(this._tooltipTimer);
      // this._tooltipTimer = setTimeout(() => {
        const rect = this.getBoundingClientRect();
        if (window.innerHeight / 2 > rect.y) {
          this._tooltip.style.top = Math.ceil(rect.y + rect.height);
        } else {
          this._tooltip.style.bottom = Math.ceil(window.innerHeight - rect.y);
        }

        if (window.innerWidth / 2 > rect.x) {
          this._tooltip.style.left = Math.ceil(rect.x);
        } else {
          this._tooltip.style.right = Math.ceil(window.innerWidth - rect.x - rect.width);
        }

        this._tooltip.classList.add('visible');
      // }, 200);
    });

    this.addEventListener('mouseout', e => {
      // if (this._tooltipTimer) clearTimeout(this._tooltipTimer);
      // this._tooltipTimer = null;
      this._tooltip.style = {};
      this._tooltip.classList.remove('visible');
    });
  }

  disconnectedCallback() {
    window.disconnectRedux(this.mapState);
  }
}

window.customElements.define('tag-inline', TagInline);
