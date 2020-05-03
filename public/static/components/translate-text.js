class TranslateText extends Component {
  static cache = {};
  static pending = {};

  /**
   * @param alias
   * @returns {Promise<{ value: String }>}
   */
  static getTranslation(alias) {
    return Promise.resolve()
      .then(() => new Promise(resolve => {
        const listener = e => {
          const state = e.detail.store.getState();
          const value = state.translations[alias];
          if (value !== undefined) {
            resolve({ value });
            window.removeEventListener(ReduxEventTypes.stateChange, listener);
          }
        }
        window.addEventListener(ReduxEventTypes.stateChange, listener);
        window.dispatchEvent(new ReduxEvents.Dispatch(translationsActions.request(alias)));
      }));
  }

  static get observedAttributes() { return ['alias']; }

  constructor() {
    super();

    this._dispatch = () => {};
    this.mapState = this.mapState.bind(this);
    this.requestTranslation = this.requestTranslation.bind(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'alias' && this.isConnected) {
      this.requestTranslation();
    }
  }

  connectedCallback() {
    window.connectRedux(this.mapState, dispatch => this._dispatch = dispatch);
    this.requestTranslation();
  }

  disconnectedCallback() {
    window.disconnectRedux(this.mapState);
  }

  requestTranslation() {
    this._dispatch(translationsActions.request(this.getAttribute('alias')));
  }

  mapState(state) {
    const alias = this.getAttribute('alias');
    if (alias && state.translations[alias] !== undefined && state.translations[alias] !== this.innerHTML) {
      this.innerHTML = state.translations[alias];
    }
  }
}

window.customElements.define('translate-text', TranslateText);
