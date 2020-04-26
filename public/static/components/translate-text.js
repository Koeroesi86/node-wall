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
        let timer;
        const checkPending = () => {
          if (timer) clearTimeout(timer);
          if (TranslateText.pending[alias]) {
            timer = setTimeout(checkPending, 10);
          } else {
            resolve();
          }
        }
        checkPending();
      }))
      .then(() => new Promise((resolve, reject) => {
        if (TranslateText.cache[alias]) {
          return resolve(TranslateText.cache[alias]);
        }

        // const meta = document.querySelector('meta[name="x-language"]');
        // let language = 'en-GB';
        // if (!language && meta) {
        //   language = meta.getAttribute('content');
        // }

        TranslateText.pending[alias] = true;
        const request = new XMLHttpRequest();
        request.onreadystatechange = e => {
          if (request.readyState === 4) {
            delete TranslateText.pending[alias];
            try {
              if (request.status === 200) {
                const translation = JSON.parse(request.responseText);
                if (translation) {
                  TranslateText.cache[alias] = translation;
                  resolve(translation);
                }
              }
            } catch (e) {
              console.warn(e);
            }

            const e = new Error(`failed to fetch translation for ${alias}`);
            e.request = request;
            reject(e);
          }
        };
        request.open("GET", `/api/translation/${alias}`, true);
        request.send();
      }));
  }

  static get observedAttributes() { return ['alias']; }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'alias' && this.isConnected) this.renderText();
  }

  connectedCallback() {
    this.renderText();
  }

  renderText() {
    const alias = this.getAttribute('alias');

    if (!alias) {
      this.innerHTML = '';
      return;
    }

    Promise.resolve()
      .then(() => TranslateText.getTranslation(alias))
      .then(translation => {
        if (translation && translation.value) {
          this.innerHTML = translation.value;
        } else {
          console.log('translation...', translation)
        }
      })
      .catch(e => console.error(e));
  }
}

window.customElements.define('translate-text', TranslateText);
