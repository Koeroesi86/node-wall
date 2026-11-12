const styleRegistry: Record<string, HTMLLinkElement> = {};

class Component extends HTMLElement {
  static styleSheet = '';

  constructor() {
    super();

    this.onStyleSheetLoaded = this.onStyleSheetLoaded.bind(this);
    this._init();
  }

  _init() {
    const styleSheet: string = Reflect.get(this.constructor, 'styleSheet');

    if (styleSheet && document) {
      if (!styleRegistry[this.localName]) {
        const styleElement = document.createElement('link');
        styleElement.setAttribute('rel', 'stylesheet');
        styleElement.setAttribute('href', styleSheet);
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
