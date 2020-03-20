class TagInline extends HTMLElement {
  constructor() {
    super();

    this.getTag = this.getTag.bind(this);
  }

  connectedCallback() {
    const tagId = this.getAttribute('tag-id');
    const tagName = this.getAttribute('tag-name');

    this.innerHTML += `
      <style type="text/css">
        tag-inline {
          display: inline-block;
          position: relative;
          cursor: pointer;
        }

        tag-inline .tooltip {
          position: fixed;
          display: none;
          padding: 3px 12px;
          font-size: 12px;
          line-height: 16px;
          background: var(--main-input-background-color);
          border: 1px solid var(--main-text-color);
        }

        tag-inline .tooltip.visible {
          display: block;
        }
      </style>
      <span class="label"></span>
      <div class="tooltip"></div>
    `;

    this._label = this.querySelector('.label');
    this._tooltip = this.querySelector('.tooltip');

    if (tagId) {
      this.getTag(tagId).then(tag => {
        if (tag.type === 'text') {
          this._label.innerText = '#';
        }

        this._label.innerText += tag.name;
        // TODO: like/dislike tag
        this._tooltip.innerHTML = `
          Címke: <a href="/tag/${tag.id}" target="_blank">${tag.name}</a>
        `;
      });
    }

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
}

window.customElements.define('tag-inline', TagInline);
