(function (g: Window) {
  function escapeHtml(value: unknown = ''): string {
    return (value + '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  g.escapeHtml = escapeHtml;

  function getPost(id: string): Promise<PostData> {
    return new Promise<PostData>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            const post = ApiSchemas.PostResponseSchema.parse(JSON.parse(request.responseText));
            if (post) resolve(post);
          } else {
            reject(request);
          }
        }
      };
      request.open("GET", `/api/posts/${id}`, true);
      request.send();
    });
  }
  g.getPost = getPost;

  function createPost(content = ''): Promise<XMLHttpRequest> {
    return new Promise<XMLHttpRequest>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange  = e => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            resolve(request);
          } else {
            reject(request);
          }
        }
      };
      request.onerror = () => {
      };
      request.open("POST", "/api/posts", true);
      request.setRequestHeader('Content-Type', 'application/json');
      request.send(JSON.stringify(ApiSchemas.CreatePostRequestSchema.parse({ content })));
    });
  }
  g.createPost = createPost;
})(window);
