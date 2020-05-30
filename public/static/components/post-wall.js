class PostWall extends Component {
  static styleSheet = '/static/components/post-wall.css';

  constructor() {
    super();

    this._dispatch = () => {};

    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
  }

  connectedCallback() {
    const instance = this.getAttribute('instance');
    connectRedux(this.mapState, this.mapDispatch);
    this._dispatch(postsListActions.createFilter(instance, [], []));

    this.innerHTML = `
      <compose-post></compose-post>
      <post-list instance="${instance}"></post-list>
    `;
    this.postList = this.querySelector('post-list');
    this._dispatch(userActions.requestTags());
  }

  mapState(state, prevState) {
    if (prevState && JSON.stringify(state.user.tags) !== JSON.stringify(prevState.user.tags)) {
      const instance = this.getAttribute('instance');
      if (!instance) return;

      const postList = document.createElement('post-list');
      const likedTags = state.user.tags.filter(t => t.type === 'liked').map(t => t.tag_id);
      const dislikedTags = state.user.tags.filter(t => t.type === 'disliked').map(t => t.tag_id);
      postList.setAttribute('instance', instance);
      postList.setAttribute('liked-tags', likedTags.join(','));
      postList.setAttribute('disliked-tags', dislikedTags.join(','));
      if (!state.postsList[instance]) {
        this._dispatch(postsListActions.createFilter(instance, likedTags, dislikedTags));
      }
      this.postList.replaceWith(postList);
      this._dispatch(postsListActions.loadMore(instance));
    }
  }

  mapDispatch(dispatch) {
    this._dispatch = dispatch;
  }
}

customElements.define('post-wall', PostWall);
