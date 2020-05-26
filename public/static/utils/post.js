(function () {
  function parseLinks(content = '', postId) {
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

  function parsePostLine(line, postId) {
    return parseLinks(parseTags(stripLine(line + '')), postId);
  }

  function parseTags(c) {
    let content = (c + '');

    [...content.matchAll(/#!([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/g)]
      .filter(match => match && match[1])
      .forEach(match => {
        content = content.replace(`#!${match[1]}`, `<tag-inline tag-id="${match[1]}"></tag-inline>`);
      });

    return content;
  }

  window.parsePostContent = function(content, postId) {
    return (content + '')
      .trim()
      .replace(/\n{3,}/gi, '\n\n')
      .split('\n')
      .map(line => `<div class="contentLine">${parsePostLine(line, postId) || '&nbsp;'}</div>`)
      .join('\n');
  }
})();

function getPost(id) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onreadystatechange = e => {
      if (request.readyState === 4) {
        if (request.status === 200) {
          const post = JSON.parse(request.responseText);
          if (post) resolve(post);
        } else {
          reject(request);
        }
      }
    };
    request.open("GET", `/api/posts/${id}`, true);
    request.send();
  });
};
