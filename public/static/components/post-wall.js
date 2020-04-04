class PostWall extends HTMLElement {
  static styleSheet = '/static/components/post-wall.css';

  constructor() {
    super();

    this.getUserTags = this.getUserTags.bind(this);
  }

  connectedCallback() {
    this.innerHTML = `
      ${window.hasStyleWrapper ? '' : `<style type="text/css">@import url('${PostWall.styleSheet}');</style>`}
      <compose-post></compose-post>
    `;

    this.getUserTags().then(tags => {
      if (!this.postList) {
        this.postList = document.createElement('post-list');
        this.postList.setAttribute('liked-tags', tags.filter(t => t.type === 'liked').map(t => t.tag_id).join(','));
        this.postList.setAttribute('disliked-tags', tags.filter(t => t.type === 'disliked').map(t => t.tag_id).join(','));
        this.appendChild(this.postList);
      }
    }).catch(e => {
      if (!this.postList) {
        this.postList = document.createElement('post-list');
        this.appendChild(this.postList);
      }
    });
  }

  getUserTags() {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const tags = JSON.parse(request.responseText);
            resolve(tags);
          }

          reject();
        }
      };
      request.open("GET", "/api/user/tags", true);
      request.send();
    });
  }
}

window.customElements.define('post-wall', PostWall);
