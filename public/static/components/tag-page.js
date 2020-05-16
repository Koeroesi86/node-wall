class TagPage extends Component {
  static styleSheet = '/static/components/tag-page.css';

  constructor() {
    super();

    this._header = '';
    this._dispatch = () => {};

    this.render = this.render.bind(this);
    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
  }

  mapState(state) {
    const tagId = this.getAttribute('tag-id');
    const tag = state.tags[tagId];
    if (tagId && tag && tag.name !== this._header) {
      this._header = tag.name;
      this.render();
    }
  }

  mapDispatch(dispatch) {
    this._dispatch = dispatch;
  }

  render() {
    const tagId = this.getAttribute('tag-id');
    // TODO: like/dislike tag
    this.innerHTML = `
      <h2>#${this._header}</h2>
      <post-list liked-tags="${tagId || ''}" instance="${tagId}"></post-list>
    `;
  }

  connectedCallback() {
    const tagId = this.getAttribute('tag-id');
    window.connectRedux(this.mapState, this.mapDispatch);
    this._dispatch(postsListActions.createFilter(tagId, [tagId], []));
    this._dispatch(tagsActions.request(tagId));
    this._dispatch(postsListActions.loadMore(tagId));
  }

  disconnectedCallback() {
    window.disconnectRedux(this.mapState);
  }
}

window.customElements.define('tag-page', TagPage);
