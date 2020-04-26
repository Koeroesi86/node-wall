class TagInline extends Component {
  static styleSheet = '/static/components/tag-inline.css';

  constructor() {
    super();

    this.getTag = this.getTag.bind(this);
  }

  connectedCallback() {
    const tagId = this.getAttribute('tag-id');
    const tagName = this.getAttribute('tag-name');

    this.innerHTML += `
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
          <translate-text alias="tag-inline.tooltip.prefix"></translate-text> <a href="/tag/${tag.id}" target="_blank">${tag.name}</a>
        `;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', `/tag/${tag.id}`);
        linkElement.setAttribute('target', '_blank');
        this._label.addEventListener('click', e => {
          linkElement.click();
        });
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
