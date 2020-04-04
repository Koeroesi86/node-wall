class StyleWrapper extends HTMLElement {
  constructor() {
    super();
    this.registerStylesheet = this.registerStylesheet.bind(this);
    this.checkNodes = this.checkNodes.bind(this);
  }

  connectedCallback() {
    if (!window.hasStyleWrapper) {
      window.hasStyleWrapper = true;

      this.observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          const nodes = mutation.addedNodes; // DOM NodeList
          if(nodes !== null) {
            this.checkNodes(nodes);
          }
        });
      });

      this.observer.observe(
        document,
        {
          attributes: false,
          childList: true,
          subtree: true,
          characterData: false,
        }
      );
    }
  }

  disconnectedCallback() {
    this.observer.disconnect();
  }

  checkNodes(nodes) {
    ([...nodes]).forEach(node => {
      if (node.constructor.styleSheet) {
        this.registerStylesheet(node.constructor.styleSheet, node.localName);
      }
      if (node.children) {
        this.checkNodes(node.children);
      }
    });
  }

  registerStylesheet(stylesheet, tagName) {
    if (!this.querySelector(`[data-tag-name="${tagName}"]`) && tagName) {
      const styleElement = document.createElement('link');
      styleElement.setAttribute('rel', 'stylesheet');
      styleElement.setAttribute('data-tag-name', tagName);
      styleElement.setAttribute('href', stylesheet);
      this.appendChild(styleElement);
    }
  }
}

window.customElements.define('style-wrapper', StyleWrapper);
