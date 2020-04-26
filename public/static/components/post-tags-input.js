/**
 * @param url
 * @param method
 * @param payload
 * @returns {Promise<Request>}
 */
function request({ url, method = 'GET', payload }) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4) {
        if (request.status < 400) {
          resolve(request);
        } else {
          reject(request);
        }
      }
    };
    request.open(method.toUpperCase(), url, true);
    request.send(payload);
  });
}

class PostTagsInput extends Component {
  static styleSheet = '/static/components/post-tags-input.css';

  constructor() {
    super();

    this.add = this.add.bind(this);
    this.remove = this.remove.bind(this);
    this.getTag = this.getTag.bind(this);
    this._searchTags = this._searchTags.bind(this);
    this.assignTag = this.assignTag.bind(this);
  }

  connectedCallback() {
    this.innerHTML += `
      <div class="tags">
        <input class="input" />
        <div class="results"></div>
      </div>
    `;

    if (!this.getAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
    this._adding = false;
    this.addEventListener('focusin', e => {
      this.classList.add('focused');
    });
    this.addEventListener('focusout', e => {
      this.classList.remove('focused');
    });
    this.currentTags = this.querySelector('.tags');
    this.tagsInput = this.querySelector('.input');
    this.resultsWrapper = this.querySelector('.results');
    let searchTimer;
    this.searchTags = term => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => this._searchTags(term), 200);
    };
    this.tagsInput.addEventListener('input', e => {
      if (this.tagsInput.value) {
        this.searchTags(this.tagsInput.value);
      } else {
        this.resultsWrapper.innerHTML = '';
      }
    });
  }

  assignTag(tagId) {
    const postId = this.getAttribute('post-id');
    return Promise.resolve()
      .then(() => request({
        method: 'POST',
        url: `/api/posts/${postId}/tags`,
        payload: JSON.stringify({ id: tagId }),
      }))
      .catch(() =>
        Promise.resolve()
          //retry?
          // .then(() => new Promise(r => setTimeout(r, 300)))
          // .then(() => this.assignTag(tagId))
      );
  }

  remove(tagId) {
    const postId = this.getAttribute('post-id');
    return Promise.resolve()
      .then(() => request({
        method: 'DELETE',
        url: `/api/posts/${postId}/tags/${tagId}`,
      }));
  }

  add(tagId, assign = true) {
    if (this._adding) {
      return Promise.resolve()
        .then(() => new Promise(r => setTimeout(r, 300)))
        .then(() => this.add(tagId, assign));
    }
    if (this.currentTags && this.currentTags.querySelector(`[tag-id="${tagId}"]`)) return Promise.resolve();
    this._adding = true;
    return Promise.resolve()
      .then(() => assign ? this.assignTag(tagId) : Promise.resolve())
      .then(() => this.getTag(tagId))
      .then(tag => {
        this._adding = false;
        const tagElement = document.createElement('div');
        tagElement.innerHTML = `
          <div class="label">${tag.name}</div>
          <div class="remove" title="Tag eltávolítása">
            <svg
              class="icon"
              enable-background="new 0 0 100 100"
              version="1.1"
              viewBox="0 0 100 100"
              xml:space="preserve"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon
                points="77.6,21.1 49.6,49.2 21.5,21.1 19.6,23 47.6,51.1 19.6,79.2 21.5,81.1 49.6,53 77.6,81.1 79.6,79.2   51.5,51.1 79.6,23 "
              />
            </svg>
          </div>
        `;
        tagElement.className = 'tagElement';
        tagElement.setAttribute('tag-id', tag.id);
        tagElement.querySelector('.remove').addEventListener('click', e => {
          this.remove(tag.id).then(() => {
            tagElement.remove();
          });
        });
        this.currentTags.insertBefore(tagElement, this.tagsInput);
        return Promise.resolve();
      }).catch(() => {
        this._adding = false;
        return this.add(tagId, assign);
      });
  }

  _searchTags(term) {
    return request({
      method: 'GET',
      url: `/api/tags?s=${term}`,
    }).then(response => {
      const results = JSON.parse(response.responseText);
      this.resultsWrapper.innerHTML = '';
      let hasExactMatch = false;
      results.forEach(tag => {
        if (this.currentTags && this.currentTags.querySelector(`[tag-id="${tag.id}"]`)) return;
        const tagNode = document.createElement('div');
        tagNode.className = 'tagResult';
        tagNode.setAttribute('tag-id', tag.id);
        tagNode.innerHTML = tag.name;
        tagNode.addEventListener('click', e => {
          tagNode.remove();
          this.add(tag.id);
        });
        if (tag.name === term) {
          hasExactMatch = true;
        }
        this.resultsWrapper.appendChild(tagNode);
      });
      if (!hasExactMatch) {
        const tagNode = document.createElement('div');
        tagNode.className = 'tagResult';
        tagNode.innerHTML = `
          "${term}" <translate-text alias="post-tags-input.create-tag"></translate-text>
        `;
        tagNode.addEventListener('click', e => {
          this.createTag(term, 'text').then(() => {
            tagNode.remove();
          });
        });
        this.resultsWrapper.appendChild(tagNode);
      }
      return Promise.resolve();
    }).catch(e => {
      return Promise.resolve()
        .then(() => new Promise(r => setTimeout(r, 300)))
        .then(() => this._searchTags(term));
    });
  }

  get tagIds() {
    return this.currentTags
      ? [...this.currentTags.querySelectorAll(`[tag-id]`)].map(t => t.getAttribute('tag-id'))
      : [];
  }

  getTag(id) {
    return Promise.resolve()
      .then(() => request({ method: 'GET', url: `/api/tags/${id}` }))
      .then(response => {
        const tag = JSON.parse(response.responseText);
        if (tag) return Promise.resolve(tag);

        return Promise.reject();
      });
  }

  createTag(name, type = 'text') {
    return Promise.resolve()
      .then(() => request({
        method: 'POST',
        url: `/api/tags`,
        payload: JSON.stringify({ name, type }),
      }))
      .then(response => {
        const tag = JSON.parse(response.responseText);
        Promise.resolve()
          .then(() => this.add(tag.id, true))
          .then(() => Promise.resolve(tag))
      })
      // .catch(() =>
      //   Promise.resolve()
      // );
  }
}

window.customElements.define('post-tags-input', PostTagsInput);
