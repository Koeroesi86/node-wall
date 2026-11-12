class TranslateText extends Component {
  declare _dispatch: ReduxDispatch;

  static cache = {};
  static pending = {};

  /**
   * @deprecated
   */
  static getTranslation(alias: string): Promise<{ value: string }> {
    return Promise.resolve()
      .then(() => new Promise<{ value: string }>(resolve => {
        const listener = e => {
          const state = e.detail.store.getState();
          const value = state.translations[alias];
          if (value) {
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
    connectRedux(this.mapState, dispatch => this._dispatch = dispatch);
    this.requestTranslation();
  }

  disconnectedCallback() {
    disconnectRedux(this.mapState);
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

customElements.define('translate-text', TranslateText);
