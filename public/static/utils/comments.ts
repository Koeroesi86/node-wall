(function (g: Window) {
  function parseCommentContent(content: string, postId?: string) {
    return (content + '')
      .trim()
      .replace(/\n{3,}/gi, '\n\n')
      .split('\n')
      .map(line => `<div class="line">${escapeHtml(line) || '&nbsp;'}</div>`)
      .join('\n');
  }
  g.parseCommentContent = parseCommentContent;

  function getComment(id: string): Promise<CommentData> {
    return new Promise<CommentData>((resolve, reject) => {
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

  function createComment(postId: string, body: string, parent?: string): Promise<CommentData> {
    return new Promise<CommentData>((resolve, reject) => {
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
})(window);
