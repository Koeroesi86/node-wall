class PostEditor extends HTMLElement {
  connectedCallback() {
    let beforeValue = this.innerText;
    this.innerHTML = `
      <style type="text/css">
        .tribute-container {
          position: absolute;
          top: 0;
          left: 0;
          height: auto;
          max-height: 300px;
          max-width: 500px;
          overflow: auto;
          display: block;
          z-index: 999999;
          background-color: var(--main-background-color);
        }

        .tribute-container ul {
          margin: 0;
          margin-top: 2px;
          padding: 0;
          list-style: none;
        }

        .tribute-container li {
          padding: 5px 5px;
          cursor: pointer;
          color: var(--main-link-color);
        }

        .tribute-container li.highlight {
          color: var(--main-link-highlighted-color);
        }

        .tribute-container li span {
          font-weight: bold;
        }

        .tribute-container li.no-match {
          cursor: default;
        }

        .tribute-container .menu-highlighted {
          font-weight: bold;
        }

        post-editor {
          display: flex;
          position: relative;
          flex: 1 0 0;
          border: 0;
          color: var(--main-link-highlighted-color);
          background-color: rgba(var(--main-button-background-color-rgb), 0.05);
          font-size: 12px;
        }

        post-editor .postEditorInput {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 25px;
          padding: 3px 6px;
          border: 1px solid rgba(var(--main-button-background-color-rgb), 0.2);
          transition: all .2s ease-in-out;
        }

        post-editor.hasContent .postEditorInput,
        post-editor .postEditorInput:focus {
         min-height: 75px;
        }

        post-editor .postEditorPlaceHolder {
          position: absolute;
          top: 0;
          left: 0;
          padding: 3px 6px;
        }

        post-editor .postEditorPlaceHolder.hidden {
          display: none;
        }
      </style>
      <div class="postEditorPlaceHolder">${this.getAttribute('placeholder')}</div>
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

      let clipboardData = e.clipboardData || window.clipboardData;
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
            return `<span tag-id="${item.original.id}" contenteditable="false">#${item.original.name}</span>`;
          },
          allowSpaces: true,
          values: (text, cb) => {
            if (!text) return;

            const request = new XMLHttpRequest();
            request.onreadystatechange = e => {
              if (request.readyState === 4 && request.status === 200) {
                const tags = JSON.parse(request.responseText);
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

window.customElements.define('post-editor', PostEditor);
