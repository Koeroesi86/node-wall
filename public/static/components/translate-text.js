const cache = {};

class TranslateText extends Component {
  static cache = {};

  static getTranslation(alias, language) {
    return new Promise((resolve, reject) => {
      if (cache[alias]) {
        return Promise.resolve(cache[alias]);
      }

      const meta = document.querySelector('meta[name="x-language"]');
      let language = 'en-GB';
      if (!language && meta) {
        language = meta.getAttribute('content');
      }

      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          try {
            if (request.status === 200) {
              const translation = JSON.parse(request.responseText);
              if (translation) resolve(translation);
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
    });
  }

  connectedCallback() {
    const alias = this.getAttribute('alias');

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
