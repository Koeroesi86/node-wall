/**
 * @param {string} id
 * @param {string} type
 * @returns {Promise<void>}
 */
function addLikedTag(id, type) {
  return new Promise((resolve, reject) => {
    if (!id) return reject(new Error('Tag id is required'));
    if (!['liked', 'disliked'].includes(type)) return reject(new Error('Invalid type'));

    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4) {
        if (request.status === 200) {
          resolve();
        } else {
          reject(request);
        }
      }
    };
    request.open("PUT", '/api/user/tags', true);
    request.setRequestHeader('Content-Type', 'application/json');
    request.send(JSON.stringify({ id, type }));
  });
}

/**
 * @param {string} id
 * @returns {Promise<void>}
 */
function removeLikedTag(id) {
  return new Promise((resolve, reject) => {
    if (!id) return reject(new Error('Tag id is required'));

    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4) {
        if (request.status === 200) {
          resolve();
        } else {
          reject(request);
        }
      }
    };
    request.open("DELETE", '/api/user/tags', true);
    request.setRequestHeader('Content-Type', 'application/json');
    request.send(JSON.stringify({ id }));
  });
}

class TagInline extends Component {
  static styleSheet = '/static/components/tag-inline.css';

  static get observedAttributes() { return ['tag-id']; }

  constructor() {
    super();

    this._tag = null;
    this._userTags = [];
    this._dispatch = () => {};

    this.mapState = this.mapState.bind(this);
    this.mapDispatch = this.mapDispatch.bind(this);
    this.requestTag = this.requestTag.bind(this);
    this.render = this.render.bind(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'tag-id' && this.isConnected) {
      this.requestTag();
    }
  }

  mapState(state, prevState) {
    const tagId = this.getAttribute('tag-id');
    const tag = state.tags[tagId];
    if (tagId && tag && tag !== this._tag) {
      this._tag = tag;
      this.render();
    }

    if (prevState && !shallowEqual(state.user.tags, prevState.user.tags)) {
      this._userTags = state.user.tags;
      this.render();
    } else if (!prevState) {
      this._userTags = state.user.tags;
      this.render();
    }
  }

  mapDispatch(dispatch) {
    this._dispatch = dispatch;
  }

  requestTag() {
    const id = this.getAttribute('tag-id');
    this._dispatch(tagsActions.request(id));
    this._dispatch(userActions.requestTags());
  }

  render() {
    if (this._tag) {
      if (this._tag.type === 'text') {
        this._label.innerText = '#';
      }

      this._label.innerText += this._tag.name;
      // TODO: like/dislike tag
      this._tooltip.innerHTML = `
        <translate-text alias="tag-inline.tooltip.prefix"></translate-text>
        <a href="/tag/${this._tag.id}" target="_blank">${this._tag.name}</a>
        <div class="actions">
          <span class="likeTag">
            <i class="fas fa-folder-plus"></i>
          </span>
          <span class="dislikeTag">
            <i class="fas fa-ban"></i>
          </span>
        </div>
      `;

      const currentUserTag = this._userTags.find(tag => tag.tag_id === this._tag.id);

      const likeTagElement = this._tooltip.querySelector('.likeTag');
      likeTagElement.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        Promise.resolve()
          .then(() => currentUserTag.type === 'liked'
            ? removeLikedTag(this._tag.id)
            : addLikedTag(this._tag.id, 'liked')
          )
          .then(() => this._dispatch(userActions.requestTags()))
          .catch(console.error);
      });

      const dislikeTagElement = this._tooltip.querySelector('.dislikeTag');
      dislikeTagElement.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        Promise.resolve()
          .then(() => currentUserTag.type === 'disliked'
            ? removeLikedTag(this._tag.id)
            : addLikedTag(this._tag.id, 'disliked')
          )
          .then(() => this._dispatch(userActions.requestTags()))
          .catch(console.error);
      });

      if (currentUserTag) {
        if (currentUserTag.type === 'liked') {
          likeTagElement.classList.add('active');
        } else if (currentUserTag.type === 'disliked') {
          dislikeTagElement.classList.add('active');
        } else {
          console.warn('Unknown type for tag', currentUserTag)
        }
      }
    }
  }

  connectedCallback() {
    this.innerHTML += `
      <span class="label"></span>
      <div class="tooltip"></div>
    `;

    this._label = this.querySelector('.label');
    this._tooltip = this.querySelector('.tooltip');

    this._label.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', `/tag/${this._tag.id}`);
      linkElement.setAttribute('target', '_blank');
      linkElement.click();
    });

    connectRedux(this.mapState, this.mapDispatch);
    this.requestTag();

    this.addEventListener('mouseover', e => {
      // if (this._tooltipTimer) clearTimeout(this._tooltipTimer);
      // this._tooltipTimer = setTimeout(() => {
        const rect = this.getBoundingClientRect();
        if (window.innerHeight / 2 > rect.y) {
          this._tooltip.style.top = Math.ceil(rect.y + rect.height);
        } else {
          this._tooltip.style.bottom = Math.ceil(window.innerHeight - rect.y);
        }

        if (window.innerWidth / 2 > rect.x) {
          this._tooltip.style.left = Math.ceil(rect.x);
        } else {
          this._tooltip.style.right = Math.ceil(window.innerWidth - rect.x - rect.width);
        }

        this._tooltip.classList.add('visible');
      // }, 200);
    });

    this.addEventListener('mouseout', e => {
      // if (this._tooltipTimer) clearTimeout(this._tooltipTimer);
      // this._tooltipTimer = null;
      this._tooltip.style = {};
      this._tooltip.classList.remove('visible');
    });
  }

  disconnectedCallback() {
    disconnectRedux(this.mapState);
  }
}

customElements.define('tag-inline', TagInline);
