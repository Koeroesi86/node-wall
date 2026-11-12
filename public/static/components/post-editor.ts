class PostEditor extends Component {
  declare editor: HTMLElement;
  declare placeholder: HTMLElement;
  declare tributeMultipleTriggers: any;

  static override styleSheet = '/static/components/post-editor.css';

  connectedCallback() {
    let beforeValue = this.innerText;
    this.innerHTML = `
      <div class="postEditorPlaceHolder">
        <translate-text alias="compose-post.input.placeholder"></translate-text>
      </div>
      <div class="postEditorInput" contenteditable="true">${beforeValue}</div>
    `;
    this.placeholder = this.querySelector('.postEditorPlaceHolder');
    this.editor = this.querySelector('.postEditorInput');

    this.editor.addEventListener('input', e => {
      this.checkEmpty();
    }, false);
    this.editor.addEventListener('paste', e => {
      e.stopPropagation();
      e.preventDefault();

      const { clipboardData } = e;
      let pastedData = clipboardData.getData('Text');

      document.execCommand('insertText', false, pastedData);
    }, false);

    this.tributeMultipleTriggers = new Tribute({
      collection: [
        // TODO: people lookup for mentions
        // {
        //   trigger: '@',
        //   selectTemplate: function (item) {
        //     return '<a href="http://zurb.com" title="' + item.original.email + '">@' + item.original.value + '</a>';
        //   },
        //   values: (text, cb) => {
        //     setTimeout(() => {
        //       cb([
        //         { key: 'Jordan Humphreys', value: 'Jordan Humphreys', email: 'jordan@zurb.com' },
        //         { key: 'Sir Walter Riley', value: 'Sir Walter Riley', email: 'jordan+riley@zurb.com' }
        //       ])
        //     }, 500);
        //   },
        // },
        {
          // TODO: add new on not found + space
          trigger: '#',
          selectTemplate: item => {
            return `<span tag-id="${escapeHtml(item.original.id)}" contenteditable="false">#${escapeHtml(item.original.name)}</span>`;
          },
          allowSpaces: true,
          values: (text, cb) => {
            if (!text) return;

            const request = new XMLHttpRequest();
            request.onreadystatechange = e => {
              if (request.readyState === 4 && request.status === 200) {
                const tags = ApiSchemas.TagListResponseSchema.parse(JSON.parse(request.responseText));
                cb(tags);
              }
            };
            request.open("GET", `/api/tags?s=${text}`, true);
            request.send();
          },
          lookup: 'name',
          fillAttr: 'name',
        }
      ]
    });

    this.tributeMultipleTriggers.attach(this.editor);
  }

  get value() {
    const tmpNode  = document.createElement('div');
    tmpNode.innerHTML = this.editor.innerHTML;
    [...tmpNode.querySelectorAll('span[tag-id]')].forEach(tagNode => {
      tagNode.replaceWith(`#!${tagNode.getAttribute('tag-id')}`)
    });
    [...tmpNode.querySelectorAll('div')].forEach(divNode => {
      if (divNode.innerHTML === '<br>')  {
        divNode.replaceWith('\n\n');
      } else {
        divNode.replaceWith('\n' + divNode.innerHTML)
      }
    });

    tmpNode.innerHTML = tmpNode.innerHTML.replace(/\r/gi, '\n')

    return tmpNode.innerHTML;
  }

  set value(value) {
    if (this.editor.innerHTML !== value) {
      this.editor.innerHTML = value;
      this.checkEmpty();
    }
  }

  checkEmpty() {
    if (this.editor.innerHTML.trim().length > 0) {
      this.placeholder.classList.add('hidden');
      this.classList.add('hasContent');
    } else {
      this.placeholder.innerHTML = this.getAttribute('placeholder');
      this.placeholder.classList.remove('hidden');
      this.classList.remove('hasContent');
    }
  }
}

customElements.define('post-editor', PostEditor);
