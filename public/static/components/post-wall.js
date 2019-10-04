class PostWall extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <style type="text/css">
        post-wall {
          display: flex;
          max-width: 100%;
          height: 100%;
          flex-direction: column;
        }
        
        post-wall post-list {
          flex: 1 1;
        }
      </style>
      <compose-post></compose-post>
      <post-list></post-list>
    `;
  }
}

window.customElements.define('post-wall', PostWall);
