class MainWrapper extends HTMLElement {
  connectedCallback() {
    this.innerHTML += `
      <style type="text/css">
        body.darkTheme {
          --main-background-color-rgb: 17, 17, 17;
          --main-text-color-rgb: 239, 239, 239;
          --main-link-color-rgb: 239, 239, 239;
          --main-link-highlighted-color-rgb: 255, 255, 255;
          --main-input-background-color-rgb: 51, 51, 51;
          --tooltip-background-color-rgb: 51, 51, 51;
          --content-wrapper-background-color-rgb: 31, 31, 31;
        }

        body {
          --main-background-color-rgb: 241, 241, 241;
          --main-background-color: rgb(var(--main-background-color-rgb));
          --main-text-color-rgb: 17, 17, 17;
          --main-text-color: rgb(var(--main-text-color-rgb));
          --main-link-color-rgb: 17, 17, 17;
          --main-link-color: rgb(var(--main-link-color-rgb));
          --main-link-highlighted-color-rgb: 17, 17, 17;
          --main-link-highlighted-color: rgb(var(--main-link-highlighted-color-rgb));
          --main-input-background-color-rgb: 200, 200, 200;
          --main-input-background-color: rgb(var(--main-input-background-color-rgb));
          --main-button-text-color: var(--main-link-highlighted-color);
          --main-button-text-color-rgb: var(--main-link-highlighted-color-rgb);
          --main-button-border-color: var(--main-link-highlighted-color);
          --main-button-border-color-rgb: var(--main-link-highlighted-color-rgb);
          --main-button-background-color: var(--main-link-highlighted-color);
          --main-button-background-color-rgb: var(--main-link-highlighted-color-rgb);
          --tooltip-background-color-rgb: 200, 200, 200;
          --tooltip-background-color: rgb(var(--tooltip-background-color-rgb));
          --tooltip-border-color: var(--main-text-color);
          --tooltip-border-color-rgb: var(--main-text-color-rgb);
          --tooltip-text-color: var(--main-button-text-color);
          --tooltip-text-color-rgb: var(--main-button-text-color-rgb);
          --tooltip-button-border-color: var(--main-button-border-color);
          --tooltip-button-border-color-rgb: var(--main-button-border-color-rgb);
          --tooltip-button-background-color: var(--main-button-background-color);
          --tooltip-button-background-color-rgb: var(--main-button-background-color-rgb);
          --content-wrapper-background-color-rgb: 239, 239, 239;
          --content-wrapper-background-color: rgb(var(--content-wrapper-background-color-rgb));
          --content-wrapper-border-color: var(--tooltip-background-color);
          --content-wrapper-text-color: var(--main-text-color);
        }

        main-wrapper {
          position: relative;
          display: flex;
          flex-direction: row;
          margin: 0;
          padding: 0;
          width: 100%;
          max-width: 100%;
          height: 100vh;
          background-color: var(--main-background-color);
          color: var(--main-text-color);
          transition: background-color .2s linear, color .2s linear, border-color .2s linear;
        }
        
        main-wrapper navigation-wrapper {
          
        }
        
        main-wrapper content-wrapper {
          flex: 1 1 0;
          display: block;
          overflow: auto;
        }
        
        @media (max-device-width: 480px) {
          main-wrapper navigation-wrapper {
            width: auto;
          }
        }
      </style>
    `;
  }
}

window.customElements.define('main-wrapper', MainWrapper);
