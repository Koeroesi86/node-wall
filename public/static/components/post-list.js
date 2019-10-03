class PostList extends HTMLElement {
  constructor() {
    super();

    this.latest = null;
    this.since = null;
    this.oldest = null;
    this.newest = null;
    this.loadMoreInterval = 6 * 60 * 60 * 1000;
    this.loadMore = this.loadMore.bind(this);
    this.getBounds = this.getBounds.bind(this);
  }

  connectedCallback() {
    this.innerHTML += `
      <style type="text/css">
        post-list {
          position: relative;
          display: block;
          padding: 12px 6px;
          overflow: auto;
        }
        
        post-list > .end {
          height: 0;
          width: 100%;
        }

        post-list > .end.loading {
          height: auto;
        }

        post-list > .end.loading .indicator {
          display: block;
        }

        post-list > .end .indicator {
          display: none;
          text-align: center;
          font-size: 12px;
        }
      </style>
      <div class="end">
        <div class="indicator">Betöltés...</div>
      </div>
    `;
    this.endNode = this.querySelector('.end');
    this._isLoading = false;
    this.addEventListener('scroll', e => {
      if (!this._isLoading) this.loadMore();
    }, false);
    this.getBounds();
  }

  getBounds() {
    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4 && request.status === 200) {
        const bounds = JSON.parse(request.responseText);

        this.oldest = bounds.oldest;
        this.newest = bounds.newest;
        this.loadMore();
      }
    };
    request.open("GET", `/api/posts/bounds`, true);
    request.send();
  }

  loadMore() {
    const bottomEdge = this.scrollTop + this.clientHeight;
    const endTop = this.endNode.offsetTop;

    if (this.since && this.since < this.oldest) {
      return;
    }
    if (endTop > bottomEdge) {
      return;
    }
    let latest;
    if (!this.latest) {
      this.latest = Date.now();
      latest = this.latest;
    } else {
      latest = this.since;
    }
    this.since = latest - this.loadMoreInterval;

    this.endNode.classList.add('loading');
    this._isLoading = true;
    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4) {
        this._isLoading = false;
        this.endNode.classList.remove('loading');
        if (request.status === 200) {
          const posts = JSON.parse(request.responseText);

          posts.forEach(post => {
            if (this.querySelector(`[post-id="${post.id}"]`)) {
              return;
            }

            const postPreview = document.createElement('post-preview');
            postPreview.setAttribute('created', post.created_at);
            postPreview.setAttribute('post-id', post.id);
            if (post.owner) {
              postPreview.setAttribute('owner-id', post.owner.id);
              postPreview.setAttribute('owner-name', post.owner.name);
            }
            postPreview.tags = post.tags;
            postPreview.innerHTML = post.content;
            this.insertBefore(postPreview, this.endNode);
          });
        }

        this.loadMore();
      }
    };
    request.open("GET", `/api/posts?before=${latest}&since=${this.since}`, true);
    request.send();
  }
}

window.customElements.define('post-list', PostList);
