const styleRegistry = {};

class Component extends HTMLElement {
  static styleSheet = '';

  constructor() {
    super();

    this.onStyleSheetLoaded = this.onStyleSheetLoaded.bind(this);
    this._init();
  }

  _init() {
    if (this.constructor.styleSheet && document) {
      if (!styleRegistry[this.localName]) {
        const styleElement = document.createElement('link');
        styleElement.setAttribute('rel', 'stylesheet');
        styleElement.setAttribute('href', this.constructor.styleSheet);
        styleElement.onload = this.onStyleSheetLoaded ? this.onStyleSheetLoaded : () => {};
        styleRegistry[this.localName] = styleElement;
        document.body.appendChild(styleElement);
      } else {
        setTimeout(() => this.onStyleSheetLoaded ? this.onStyleSheetLoaded() : null, 1);
      }
    }
  }

  onStyleSheetLoaded() {

  }
}
