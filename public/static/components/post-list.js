class PostList extends Component {
  static styleSheet = '/static/components/post-list.css';

  static get observedAttributes() { return ['instance']; }

  constructor() {
    super();

    this.latest = null;
    this.since = null;
    this.oldest = null;
    this.newest = null;
    this._dispatch = () => {};

    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
    this.loadMore = this.loadMore.bind(this);
  }

  onStyleSheetLoaded() {
    setTimeout(() => {
      this.loadMore();
    }, 500);
  }

  connectedCallback() {
    this.innerHTML += `
      <audio src="/static/media/notification.mp3" class="notification"></audio>
      <div class="end">
        <div class="indicator"><translate-text alias="post-list.loading"></translate-text></div>
      </div>
    `;
    this.notificationNode = this.querySelector('.notification');
    this.endNode = this.querySelector('.end');
    this.addEventListener('scroll', e => {
      this.loadMore();
    }, false);
    connectRedux(this.mapState, this.mapDispatch);
  }

  disconnectedCallback() {
    disconnectRedux(this.mapState);
  }

  mapState(state, prevState) {
    if (prevState && prevState.bounds.newest && state.bounds.newest > prevState.bounds.newest) {
      setTimeout(() => {
        this.notificationNode.play();
        this._dispatch(postsListActions.loadNew(this.getAttribute('instance')));
      }, 2000);
    }

    if (state.bounds.oldest !== this.oldest) {
      this.oldest = state.bounds.oldest;
      this.loadMore();
    }

    const instance = this.getAttribute('instance');
    if (state.postsList && instance && state.postsList[instance]) {
      const postsListInstance = state.postsList[instance];
      const prevPostsListInstance = prevState ? prevState.postsList[instance] : {};

      if (postsListInstance && JSON.stringify(postsListInstance.posts) !== JSON.stringify(prevPostsListInstance.posts)) {
        this.querySelectorAll('post-preview').forEach(postPreviewNode => {
          if (!postsListInstance.posts.includes(postPreviewNode.getAttribute('post-id'))) {
            postPreviewNode.remove();
          }
        });

        for (let i = postsListInstance.posts.length - 1; i >= 0; i--) {
          const id = postsListInstance.posts[i];
          if (i < postsListInstance.posts.length - 1 && postsListInstance.posts.length > 1) {
            this.addPostBefore({ id }, this.querySelector(`post-preview[post-id="${postsListInstance.posts[i + 1]}"]`));
          } else {
            this.addPostBefore({ id }, this.endNode);
          }
        }
        this.loadMore();
      }

      if (postsListInstance.isLoading) {
        this.endNode.classList.add('loading');
      } else {
        this.endNode.classList.remove('loading');
      }
    }
  }

  mapDispatch(dispatch) {
    this._dispatch = dispatch;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.isConnected && (name === 'liked-tags' || name === 'disliked-tags')) {
      // this.querySelectorAll('post-preview').forEach(previewNode => {
      //   previewNode.remove();
      // });
      // this.loadMore();
    }
  }

  loadMore() {
    const bottomEdge = this.scrollTop + this.clientHeight;
    const endTop = this.endNode.offsetTop;

    if (endTop > bottomEdge) {
      return;
    }

    this._dispatch(postsListActions.loadMore(this.getAttribute('instance')));
  }

  addPostBefore(post, node) {
    if (this.querySelector(`post-preview[post-id="${post.id}"]`)) {
      return;
    }

    const postPreview = document.createElement('post-preview');
    postPreview.setAttribute('post-id', post.id);

    this.insertBefore(postPreview, node);
  }
}

customElements.define('post-list', PostList);
