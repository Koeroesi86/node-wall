class PostWall extends Component {
  static styleSheet = '/static/components/post-wall.css';

  constructor() {
    super();

    this._dispatch = () => {};
    this._tags = [];

    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
  }

  connectedCallback() {
    this.innerHTML = `
      <compose-post></compose-post>
      <post-list></post-list>
    `;
    this.postList = this.querySelector('post-list');

    window.connectRedux(this.mapState, this.mapDispatch);
    this._dispatch(userActions.requestTags());
  }

  mapState(state) {
    if (state.user.tags && this._tags !== state.user.tags) {
      this._tags = state.user.tags;
      const postList = document.createElement('post-list');
      postList.setAttribute('liked-tags', this._tags.filter(t => t.type === 'liked').map(t => t.tag_id).join(','));
      postList.setAttribute('disliked-tags', this._tags.filter(t => t.type === 'disliked').map(t => t.tag_id).join(','));
      this.postList.replaceWith(postList);
    }
  }

  mapDispatch(dispatch) {
    this._dispatch = dispatch;
  }
}

window.customElements.define('post-wall', PostWall);
