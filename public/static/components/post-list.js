class PostList extends HTMLElement {
  constructor() {
    super();

    this.latest = null;
    this.since = null;
    this.oldest = null;
    this.newest = null;
    this.lastNewest = null;
    this.loadMoreInterval = 6 * 60 * 60 * 1000;
    this.loadMore = this.loadMore.bind(this);
    this.getBounds = this.getBounds.bind(this);
    this.getNewPosts = this.getNewPosts.bind(this);
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
        
        post-list > .notification {
          display: none;
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
      <audio src="/static/media/notification.mp3" class="notification"></audio>
      <div class="end">
        <div class="indicator">Betöltés...</div>
      </div>
    `;
    this.notificationNode = this.querySelector('.notification');
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

        if (!this.newest) {
          setTimeout(() => {
            this.loadMore();
          }, 500);
        }

        if (this.newest && this.newest < bounds.newest) {
          setTimeout(() => {
            this.notificationNode.play();
            this.getNewPosts();
          }, 2000);
        }

        this.oldest = bounds.oldest;
        this.newest = bounds.newest;
        if (!this.lastNewest) this.lastNewest = this.newest;

        setTimeout(() => {
          this.getBounds();
        }, 5 * 1000);
      }
    };
    request.open("GET", `/api/posts/bounds`, true);
    request.send();
  }

  getNewPosts() {
    this.getPosts(this.newest).then(posts => {
      for (let i = posts.length - 1; i >= 0; i--) {
        const post = posts[i];

        const first = this.querySelector('post-preview:first-of-type');
        this.addPostBefore(post, first);
      }
    });
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
    this.getPosts(this.since, latest).then(posts => {
      this._isLoading = false;
      this.endNode.classList.remove('loading');

      posts.forEach(post => {
        this.addPostBefore(post, this.endNode);
      });

      this.loadMore();
    }).catch(() => {
      this.loadMore();
    });
  }

  addPostBefore(post, node) {
    if (this.querySelector(`post-preview[post-id="${post.id}"]`)) {
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
    this.insertBefore(postPreview, node);
  }

  getPosts(since, before) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const posts = JSON.parse(request.responseText);

            resolve(posts);
          } else {
            reject();
          }
        }
      };
      request.open("GET", `/api/posts?since=${since}${before ? `&before=${before}` : ''}`, true);
      request.send();
    })
  }
}

window.customElements.define('post-list', PostList);
