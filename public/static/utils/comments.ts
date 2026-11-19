(function (g: Window) {
  function getComment(id: string): Promise<CommentData> {
    return new Promise<CommentData>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const comment = ApiSchemas.CommentResponseSchema.parse(JSON.parse(request.responseText));
            resolve(comment);
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

  function createComment(postId: string, body: string, parent?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            ApiSchemas.EmptyResponseSchema.parse(JSON.parse(request.responseText));
            resolve();
          } else {
            reject(request);
          }
        }
      };
      request.open("POST", `/api/comment`, true);
      request.setRequestHeader('Content-Type', 'application/json');
      request.send(JSON.stringify(ApiSchemas.CreateCommentRequestSchema.parse({ body, parent, postId })));
    });
  }
  g.createComment = createComment;
})(window);
