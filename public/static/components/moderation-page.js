class ModerationPage extends HTMLElement {
  constructor() {
    super();

    this.getPosts = this.getPosts.bind(this);
  }

  connectedCallback() {
    this.innerHTML += `
      <style type="text/css">
        moderation-page {
          display: block;
          padding: 0 20px;
        }
        
        moderation-page > .notification {
          display: none;
        }
        
        moderation-page .pendingPosts {
        
        }
        
        moderation-page .heading {
          margin-bottom: 12px;
        }
        
        moderation-page .pendingPosts .loading {
          text-align: center;
        }
        
        moderation-page .pendingPosts .loading.hidden {
          display: none;
        }
        
        moderation-page .postModerationWrapper {
          padding: 6px;
          margin-bottom: 12px;
          background: rgba(255, 255, 255, 0.05);
        }
        
        moderation-page .postModerationWrapper .buttonsWrapper {
          display: flex;
          flex-direction: row;
        }
        
        moderation-page .postModerationWrapper .button {
          flex: 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          padding: 0 12px;
          height: 35px;
          font-size: 12px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-radius: 3px;
          color: #efefef;
          background: transparent;
          cursor: pointer;
          transition: all .2s ease-in-out;
        }
        
        @media (max-device-width: 480px) {
          moderation-page .postModerationWrapper .button {
            flex: 1 1 0;
          }        
        }
        
        moderation-page .postModerationWrapper .button:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.8);
        }
        
        moderation-page .newTags {
          display: flex;
          flex-direction: row;
          padding: 6px 12px;
          margin-bottom: 12px;
          font-size: 12px;
          background: rgba(255, 255, 255, 0.05);
        }
        
        moderation-page .newTagsList {
          flex: 1 1 0;
          padding: 0 6px;
        }
        
        moderation-page .newTagsItem {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          padding: 0 6px;
          line-height: 20px;
          margin-right: 12px;
        }
      </style>
      <audio src="/static/media/notification.mp3" class="notification"></audio>
      <div>
        <h3>Moderáció</h3>
        <div>
          <div class="heading">Moderálásra váró bejegyzések:</div>
          <div class="pendingPosts">
            <div class="loading">Loading</div>
          </div>
        </div>
      </div>
    `;

    this.notificationNode = this.querySelector('.notification');
    this.pendingPostsContainer = this.querySelector('.pendingPosts');
    this.pendingPostsLoading = this.querySelector('.pendingPosts .loading');

    this._initialized = false;
    this.getPosts();
  }

  getPosts() {
    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4 && request.status === 200) {
        this.pendingPostsLoading.classList.add('hidden');
        const posts = JSON.parse(request.responseText);
        if (posts.length === 0) {
          this.pendingPostsContainer.innerHTML += `
            <div class="noPostsMessage">
              Jelenleg nincs moderációra váró bejegyzés.
            </div>
          `
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

          const newTags = [...post.content.matchAll(/#[a-z\u00C0-\u017F0-9]+/gi)].map(m => m[0]);
          const postModerationWrapper = document.createElement('div');
          postModerationWrapper.classList.add('postModerationWrapper');
          postModerationWrapper.setAttribute('post-id', post.id);
          postModerationWrapper.innerHTML = `
            <post-preview
              post-id="${post.id}"
              created="${post.created_at}"
            ${post.owner ? ` owner-id="${post.owner.id}" owner-name="${post.owner.name}"` : ''}
            >${post.content}</post-preview>
            ${newTags.length > 0 ? `
            <div class="newTags">
              <div  class="newTagsNote">Ezek az új tagek kerülnek hozzáadásra:</div>
              <div class="newTagsList">
                ${newTags.map(t => `<div class="newTagsItem">${t}</div>`).join('')}
              </div>
            </div>
            ` : ''}
            <div class="buttonsWrapper">
              <button type="button" class="button approve">Engedélyezés</button>
              <button type="button" class="button disapprove">Elutasítás</button>
            </div>
          `;
          const postPreview = postModerationWrapper.querySelector('post-preview');
          postPreview.tags = post.tags;
          this.pendingPostsContainer.appendChild(postModerationWrapper);
        });

        [...this.pendingPostsContainer.querySelectorAll('.postModerationWrapper .approve')].forEach(approveButton => {
          approveButton.addEventListener('click', e => {
            e.stopPropagation();
            e.preventDefault();
            const postModerationWrapper = e.target.closest('.postModerationWrapper');
            const postId = postModerationWrapper.getAttribute('post-id');
            this.setPostStatus(postId, 'public')
          });
        });

        [...this.pendingPostsContainer.querySelectorAll('.postModerationWrapper .disapprove')].forEach(disapproveButton => {
          disapproveButton.addEventListener('click', e => {
            e.stopPropagation();
            e.preventDefault();
            const postModerationWrapper = e.target.closest('.postModerationWrapper');
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
      }
    };
    request.open("GET", "/api/posts?status=pending", true);
    request.send();
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
