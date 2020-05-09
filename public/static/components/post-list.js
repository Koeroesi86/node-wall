class PostList extends Component {
  static styleSheet = '/static/components/post-list.css';

  // TODO: connect
  static get observedAttributes() { return ['liked-tags', 'disliked-tags']; }

  constructor() {
    super();

    this.latest = null;
    this.since = null;
    this.oldest = null;
    this.newest = null;
    this.lastNewest = null;
    this.likedTags = [];
    this.dislikedTags = [];
    this.loadMoreInterval = 6 * 60 * 60 * 1000;
    this._dispatch = () => {};

    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
    this.loadMore = this.loadMore.bind(this);
    this.getNewPosts = this.getNewPosts.bind(this);
  }

  connectedCallback() {
    const likedTags = this.getAttribute('liked-tags');
    if (likedTags) this.likedTags = likedTags.split(',');
    const dislikedTags = this.getAttribute('disliked-tags');
    if (dislikedTags) this.dislikedTags = dislikedTags.split(',');
    this.innerHTML += `
      <audio src="/static/media/notification.mp3" class="notification"></audio>
      <div class="end">
        <div class="indicator"><translate-text alias="post-list.loading"></translate-text></div>
      </div>
    `;
    this.notificationNode = this.querySelector('.notification');
    this.endNode = this.querySelector('.end');
    this._isLoading = false;
    this.addEventListener('scroll', e => {
      if (!this._isLoading) this.loadMore();
    }, false);
    window.connectRedux(this.mapState, this.mapDispatch);
  }

  mapState(state) {
    if (state.bounds.newest !== this.newest) {
      if (this.newest && this.newest < state.bounds.newest) {
        setTimeout(() => {
          this.notificationNode.play();
          this.getNewPosts();
        }, 2000);
      }
      if (!this.lastNewest) {
        this.lastNewest = this.newest;
      }
      this.newest = state.bounds.newest;
    }

    if (state.bounds.oldest !== this.oldest) {
      this.oldest = state.bounds.oldest;
      if (!this._isLoading) this.loadMore();
    }

  }

  mapDispatch(dispatch) {
    this._dispatch = dispatch;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'liked-tags' || name === 'disliked-tags') {
      this.querySelectorAll('post-preview').forEach(previewNode => {
        previewNode.remove();
      });
    }
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
    if (this.nextPageBefore) {
      this.latest = this.nextPageBefore;
      latest = this.latest;
    } else if (!this.latest) {
      this.latest = this.newest + 1;
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
      this._isLoading = false;
      this.loadMore();
    });
  }

  addPostBefore(post, node) {
    if (this.querySelector(`post-preview[post-id="${post.id}"]`)) {
      return;
    }

    const postPreview = document.createElement('post-preview');
    postPreview.setAttribute('post-id', post.id);

    this.insertBefore(postPreview, node);
  }

  getPosts(since, before) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const posts = JSON.parse(request.responseText);
            const nextPageBefore = request.getResponseHeader('x-next-page-before');
            if (nextPageBefore) {
              this.nextPageBefore = nextPageBefore;
            }

            resolve(posts);
          } else {
            reject();
          }
        }
      };
      const url = new URL(window.location.origin);
      url.pathname = '/api/posts';
      url.searchParams.set('since', since);
      if (before) url.searchParams.set('before', before);
      if (this.likedTags.length > 0) url.searchParams.set('likedTags', this.likedTags.join(','));
      if (this.dislikedTags.length > 0) url.searchParams.set('dislikedTags', this.dislikedTags.join(','));
      request.open("GET", url.toString(), true);
      request.send();
    });
  }
}

window.customElements.define('post-list', PostList);
