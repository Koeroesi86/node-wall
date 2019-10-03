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

    this.composePost = this.querySelector('compose-post');
    this.postList = this.querySelector('post-list');
    this.composePost.addEventListener('send-message', e => {
      const { message } = e.detail;

      if (message && message.length > 0) {
        const request = new XMLHttpRequest();
        request.onreadystatechange  = e => {
          if (request.readyState === 4 && request.status === 200) {
            //
          }
        };
        request.onerror = () => {
        };
        request.open("POST", "/api/posts", true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify({ content: message }));
      }
    });
  }
}

window.customElements.define('post-wall', PostWall);
