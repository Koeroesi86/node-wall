(function (g) {
  function parseCommentContent(content, postId) {
    return (content + '')
      .trim()
      .replace(/\n{3,}/gi, '\n\n')
      .split('\n')
      .map(line => `<div class="line">${line || '&nbsp;'}</div>`)
      .join('\n');
  }
  g.parseCommentContent = parseCommentContent;

  function getComment(id) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const comments = JSON.parse(request.responseText);
            if (comments) resolve(comments);
          } else {
            reject(request);
          }
        }
      };
      request.open("GET", `/api/comment/${id}`, true);
      request.send();
    });
  }
  g.getComment = getComment;

  function createComment(postId, body, parent = null) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const comments = JSON.parse(request.responseText);
            if (comments) resolve(comments);
          } else {
            reject(request);
          }
        }
      };
      request.open("POST", `/api/comment`, true);
      request.setRequestHeader('Content-Type', 'application/json');
      request.send(JSON.stringify({ body, parent, postId }));
    });
  }
  g.createComment = createComment;
})(window || global || module.exports);
