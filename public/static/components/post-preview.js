function linkify(content = '', postId) {
  let result = content;

  result = result.replace(
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/igm,
    `<a is="link-preview" href="$1" post-id="${postId}"></a>`
  );

  result = result.replace(
    /(^|[^\/])(www\.[\S]+(\b|$))/gim,
    `$1<a is="link-preview" href="https://$2" post-id="${postId}"></a>`
  );

  return result;
}

function stripLine(line = '') {
  const tmp = document.createElement('span');
  tmp.innerHTML = line;
  return tmp.innerText.replace(/&amp;nbsp;/gi, '&nbsp;');
}

class PostPreview extends HTMLElement {
  constructor() {
    super();
    this.tags = [];
    this.getTag = this.getTag.bind(this);
    this.checkOwner = this.checkOwner.bind(this);
  }

  connectedCallback() {
    this.content = this.innerHTML;
    const createdRaw = this.getAttribute('created');
    const created = new Date(parseInt(createdRaw, 10));

    this.innerHTML = `
      <style type="text/css">
        post-preview {
          display: block;
          padding: 6px 12px;
          margin-bottom: 12px;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        
        post-preview .content {
          font-size: 12px;
        }

        post-preview .meta {
          display: flex;
          flex-direction: row;
          justify-content: flex-start;
          font-size: 10px;
          margin-top: 3px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 3px;
        }
        
        post-preview .meta .owner {
          padding-left: 12px;;
        }
        
        post-preview.loading .sent,
        post-preview.loading .content {
          display: none;
        }

        post-preview.loading .loadingIndicator {
          display: block;
          font-size: 12px;
        }
        
        post-preview .loadingIndicator {
          display: none;
        }
        
        post-preview a {
          color: inherit;
        }
      </style>
      <div class="loadingIndicator">Betöltés...</div>
      <div class="content"></div>
      <div class="meta">
        <div class="sent">Küldve: ${created.toLocaleString()}</div>
        <div class="owner"></div>
      </div>
    `;
    this.contentContainer = this.querySelector('.content');
    this.parseContent();
    this.checkOwner()
  }

  parseContent() {
    let content = this.content;
    content = content.trim();
    content = content.replace(/\n{3,}/gi, '\n\n');
    content = content.split('\n').map(line => `
      <div>
        ${linkify(stripLine(line), this.getAttribute('post-id')) || '&nbsp;'}
      </div>
    `).join('');
    this.tags.forEach(tag => {
      content = content.replace(`#!${tag.id}`, `<span tag-id="${tag.id}" title="${tag.name}">#${tag.name}</span>`)
    });
    const matches = [...content.matchAll(/#!([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/gi)];
    if (matches) {
      this.classList.add('loading');
      Promise.resolve()
        .then(() => Promise.all([...matches].map(match => this.getTag(match[1]))))
        .then(tags => {
          tags.forEach(tag => {
            content = content.replace(`#!${tag.id}`, `<span tag-id="${tag.id}" title="${tag.name}">#${tag.name}</span>`)
          });
          this.contentContainer.innerHTML = content;
          this.classList.remove('loading')
        })
        .catch(() => {
          Promise.resolve()
            .then(() => new Promise(r => setTimeout(r, 500)))
            .then(() => this.parseContent());
        });
    } else {
      this.contentContainer.innerHTML = content;
    }
  }

  getTag(id) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const tag = JSON.parse(request.responseText);
            if (tag) resolve(tag);
          }

          reject();
        }
      };
      request.open("GET", `/api/tags/${id}`, true);
      request.send();
    });
  }

  checkOwner() {
    const ownerId = this.getAttribute('owner-id');
    if (!ownerId) return;
    const ownerName = this.getAttribute('owner-name');
    const owner = this.querySelector('.owner');
    owner.innerText = `Beküldő: ${ownerName && ownerName !== 'null' ? ownerName : 'Névtelen idegen'}`;
  }
}

window.customElements.define('post-preview', PostPreview);
