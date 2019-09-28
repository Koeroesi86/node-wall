class PostList extends HTMLElement {
  constructor() {
    super();

    this.refresh = this.refresh.bind(this);
  }

  connectedCallback() {
    this.innerHTML += `
      <style type="text/css">
        post-list {
          display: block;
          padding: 12px 6px;
        }

        post-list > div.loading {
          display: none;
          text-align: center;
          font-size: 12px;
        }

        post-list > div.loading.visible {
          display: block;
        }
      </style>
      <div class="loading">Frissítés...</div>
    `;
    this.loading = this.querySelector('.loading');
    this.refresh();
  }

  refresh() {
    this.loading.classList.add('visible');
    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4 && request.status === 200) {
        this.loading.classList.remove('visible');
        const posts = JSON.parse(request.responseText);
        posts.forEach(post => {
          if (this.querySelector(`[post-id="${post.id}"]`)) {
            return;
          }

          const postPreview = document.createElement('post-preview');
          postPreview.setAttribute('created', post.created_at);
          postPreview.setAttribute('post-id', post.id);
          if (post.owner) postPreview.setAttribute('owner', post.owner);
          postPreview.innerHTML = post.content;
          this.appendChild(postPreview);
        });
      }
    };
    request.open("GET", "/api/posts", true);
    request.send();
  }
}

window.customElements.define('post-list', PostList);
