class MainWrapper extends HTMLElement {
  connectedCallback() {
    this.innerHTML += `
      <style type="text/css">
        main-wrapper {
          position: relative;
          display: flex;
          flex-direction: row;
          margin: 0;
          padding: 0;
          width: 100%;
          max-width: 100%;
          height: 100vh;
          background-color: #111111;
          color: #efefef;
        }
        
        main-wrapper navigation-wrapper {
          width: 200px;
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
