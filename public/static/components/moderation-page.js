class ModerationPage extends Component {
  static styleSheet = '/static/components/moderation-page.css';

  constructor() {
    super();

    this.getPosts = this.getPosts.bind(this);
    this.fetchPosts = this.fetchPosts.bind(this);
  }

  connectedCallback() {
    this.innerHTML += `
      <audio src="/static/media/notification.mp3" class="notification"></audio>
      <div>
        <h3>
          <translate-text alias="moderation-page.header"></translate-text>
        </h3>
        <div>
          <div class="heading">
            <translate-text alias="moderation-page.posts.header"></translate-text>
          </div>
          <div class="pendingPosts">
            <div class="loading">
              <translate-text alias="moderation-page.posts.loading"></translate-text>
            </div>
          </div>
        </div>
      </div>
    `;

    this.notificationNode = this.querySelector('.notification');
    this.pendingPostsContainer = this.querySelector('.pendingPosts');
    this.pendingPostsLoading = this.querySelector('.pendingPosts .loading');

    this._initialized = false;
    this.latest = null;
    Promise.resolve()
      .then(() => TranslateText.getTranslation('moderation-page.posts.create-tag-title'))
      .then(translation => {
        this.createTagTitle = translation.value;
        return Promise.resolve();
      })
      .then(() => this.getPosts());
  }

  getPosts() {
    Promise.resolve()
      .then(() => this.fetchPosts())
      .then(posts => {
        this.pendingPostsLoading.classList.add('hidden');
        if (posts.length === 0) {
          if (!this._initialized) {
            this.pendingPostsContainer.innerHTML += `
              <div class="noPostsMessage">
                <translate-text alias="moderation-page.posts.no-posts"></translate-text>
              </div>
            `;
          }
        } else {
          const noPostsMessage = this.querySelector('.noPostsMessage');
          if (noPostsMessage) {
            noPostsMessage.remove();
          }
        }
        const lengthBefore = this.pendingPostsContainer.querySelectorAll('.postModerationWrapper').length;
        posts.forEach(post => {
          if (this.pendingPostsContainer.querySelector(`[post-id="${post.id}"]`)) {
            return;
          }

          const postModerationWrapper = document.createElement('div');
          postModerationWrapper.classList.add('postModerationWrapper');
          postModerationWrapper.setAttribute('post-id', post.id);
          postModerationWrapper.innerHTML = `
            <post-preview
              post-id="${post.id}"
              created="${post.created_at}"
              ${post.owner ? `owner-id="${post.owner.id}" owner-name="${post.owner.name}" ` : ''}
            ></post-preview>
            <div class="newTags" style="display: none;">
              <div class="newTagsNote">
                <translate-text alias="moderation-page.posts.new-tags-note"></translate-text>
              </div>
              <div class="newTagsList"></div>
            </div>
            <div class="addTags">
              <div class="addTagsHeading">
                <translate-text alias="moderation-page.posts.add-tags-heading"></translate-text>
              </div>
              <post-tags-input post-id="${post.id}"></post-tags-input>
            </div>
            <div class="buttonsWrapper">
              <button type="button" class="button approve">
                <translate-text alias="moderation-page.posts.approve"></translate-text>
              </button>
              <button type="button" class="button disapprove">
                <translate-text alias="moderation-page.posts.disapprove"></translate-text>
              </button>
            </div>
          `;

          const newTagsWrapper = postModerationWrapper.querySelector('.newTags');
          const tagsInput = postModerationWrapper.querySelector('post-tags-input');
          [...postModerationWrapper.querySelectorAll('.newTagsItem')].forEach(newTagsItem => {
            const addElement = newTagsItem.querySelector('.add');
            addElement.addEventListener('click', e => {
              const newTagAttribute = addElement.getAttribute('new-tag');
              const newTag = newTagAttribute.match(/[a-z\u00C0-\u017F0-9]+/gi)[0];
              tagsInput.createTag(newTag, 'text').then(() => {
                newTagsItem.remove();
              });
            });
          });

          getPost(post.id).then(postDetails => {
            postDetails.tags.forEach(tag => {
              tagsInput.add(tag.id, false);
            });

            const newTags = [...postDetails.content.matchAll(/#[a-z\u00C0-\u017F0-9]+/gi)]
              .map(m => m[0])
              .filter(text => !postDetails.tags.find(t => `#${t.name}` === text));
            if (newTags.length > 0) {
              newTagsWrapper.style.display = '';
            }
            newTagsWrapper.querySelector('.newTagsList').innerHTML = newTags.map(t => `
                  <div class="newTagsItem">
                    <div class="label">${t}</div>
                    <div class="add" title="${this.createTagTitle}" new-tag="${t}">
                      <svg
                        class="icon"
                        enable-background="new 0 0 100 100"
                        version="1.1"
                        viewBox="0 0 100 100"
                        xml:space="preserve"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <polygon
                          points="80.2,51.6 51.4,51.6 51.4,22.6 48.9,22.6 48.9,51.6 19.9,51.6 19.9,54.1 48.9,54.1 48.9,83.1   51.4,83.1 51.4,54.1 80.4,54.1 80.4,51.6 "
                        />
                      </svg>
                    </div>
                  </div>
                `).join('');
          });

          const postPreview = postModerationWrapper.querySelector('post-preview');
          postPreview.setAttribute('post-id', post.id);
          this.pendingPostsContainer.appendChild(postModerationWrapper);
          if (this.latest < post.created_at) this.latest = post.created_at;
        });

        [...this.pendingPostsContainer.querySelectorAll('.postModerationWrapper')].forEach(postModerationWrapper => {
          const approveButton = postModerationWrapper.querySelector('.approve');
          const disapproveButton = postModerationWrapper.querySelector('.disapprove');

          approveButton.addEventListener('click', e => {
            e.stopPropagation();
            e.preventDefault();
            const tagsInput = postModerationWrapper.querySelector('post-tags-input');
            if (tagsInput.tagIds.length === 0) {
              Promise.resolve()
                .then(() => TranslateText.getTranslation('moderation-page.posts.no-tags-alert'))
                .then(translation => {
                  alert(translation.value);
                })
                .catch(e => console.error(e))
              return;
            }

            const postId = postModerationWrapper.getAttribute('post-id');
            this.setPostStatus(postId, 'public');
          });
          disapproveButton.addEventListener('click', e => {
            e.stopPropagation();
            e.preventDefault();
            const postId = postModerationWrapper.getAttribute('post-id');
            this.setPostStatus(postId, 'moderated')
          });
        });

        const lengthAfter = this.pendingPostsContainer.querySelectorAll('.postModerationWrapper').length;
        if (this._initialized && lengthBefore !== lengthAfter) {
          this.notificationNode.play();
        }
        this._initialized = true;
        setTimeout(() => {
          this.getPosts();
        }, 5 * 1000);
      })
      .catch(e => console.error(e));
  }

  fetchPosts() {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            resolve(JSON.parse(request.responseText));
          }
          reject();
        }
      };
      request.open("GET", `/api/posts?status=pending${this.latest ? `&since=${this.latest + 1}` : ''}`, true);
      request.send();
    });
  }

  setPostStatus(postId, status) {
    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4 && [200, 201].includes(request.status)) {
        window.location.reload();
      }
    };
    // TODO: fix `/api/posts/${postId}` access
    request.open("PUT", `/api/posts?id=${postId}`, true);
    request.setRequestHeader('Content-Type', 'application/json');
    request.send(JSON.stringify({ status }));
  }
}

window.customElements.define('moderation-page', ModerationPage);
