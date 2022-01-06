export function makeCardHTMLBlock (title, language, code, id, likes, commentCount, relativeTime, exactTime) {
  return `
<div class="col">
  <div class="card h-100">
    <div class="card-body">
      <h5 class="card-title">${title}</h5>
      <h6 class="card-subtitle mb-2 text-muted">Language: ${language}</h6>
      <pre><code class="language-${language.toLowerCase()} code-snippet rounded-3" tabindex="0">${code}</code></pre>
      <button type="button" class="btn btn-primary" data-bs-toggle="modal"
              data-bs-target="#postId-${id}">See post
      </button>
    </div>
    <div class="card-footer text-muted">
      <div class="d-flex justify-content-between">
        <div class="text-danger" id="card1Likes">
          ${likes} <a href="#" class="text-danger like-button"><3</a> s
        </div>
        <div id="post${id}CommentCount">
          <span class="material-icons align-middle md-24">forum</span> ${commentCount}
        </div>
        <div class="text-start" title="${exactTime}">
          ${relativeTime}
        </div>
      </div>
    </div>
  </div>
</div>`;
}

export function makeCardModalHTMLBlock (id, title, language, code, redditLink, rUpvotes, rUser, rComments) {
  return `
<div class="modal fade" id="postId-${id}" tabindex="-1" aria-labelledby="postId-${id}ModalLabel"
           aria-hidden="true">
  <div class="modal-dialog modal-fullscreen-lg-down modal-dialog-scrollable modal-dialog-centered modal-xl">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">${title}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"
                aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <pre><code class="language-${language.toLowerCase()} code-text rounded-3" tabindex="0">${code}</code></pre>
        <div class="container mt-2 mb-2 ms-0">
          <div class="row align-items-center">
            <div class="col-sm-auto">
              <a href="${redditLink}"  target="_blank" class="btn btn-outline-primary"
                 title="View original Reddit source">
                <span class="material-icons md-18 align-middle">open_in_new</span>
                Reddit
              </a>
            </div>
            <div class="col-sm-8 mt-1 mb-1">
              <div class="row reddit-info-row ">
                <div class="col col-sm-auto" title="Reddit upvotes">
                  <span class="material-icons md-24 align-middle">trending_up</span>
                  <span class="align-middle">${rUpvotes}</span>
                </div>
                <div class="col col-sm-auto" title="Original Reddit poster">
                  <span class="material-icons md-24 align-middle">account_circle</span>
                  <span class="align-middle">${rUser}</span>
                </div>
                <div class="col col-sm-auto" title="Reddit comment depth">
                  <span class="material-icons md-24 align-middle">analytics</span>
                  <span class="align-middle">${rComments}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="d-flex justify-content-center align-items-center">
          <span class="material-icons md-36 align-middle me-2">forum</span>
          <h1><span class="align-middle">Comments</span></h1>
        </div>
        <form class="comment-form" id="commentForm${id}">
          <div class="input-group mt-2 mb-2">
            <span class="input-group-text">Comment:</span>
            <textarea class="form-control" aria-label="Comment Text" name="content"></textarea>
            <button class="btn btn-outline-secondary" type="submit" id="commentPostButton${id}">Post!</button>
          </div>
          <div id="commentAlert${id}"></div>
        </form>
        <ul class="list-group list-group-flush" id="card${id}CommentsList">
          <!-- todo: shorten comments via JS adapting to device width -->
          <!-- todo: make comments separate scrollable -->
        </ul>
      </div>
    </div>
  </div>
</div>`;
}

export function commentLiElement (content, relativeTime) {
  return `
<li class="list-group-item">
  <div class="d-flex justify-content-between">
    <div>
      ${content}
    </div>
    <div class="text-muted">
      ${relativeTime}
    </div>
  </div>
</li>`;
}

export function placeholderCard () {
  return `
<div class="col temp-placeholder-card">
  <div class="card h-100" aria-hidden="true">
    <div class="card-body">
      <h5 class="card-title placeholder-glow">
        <span class="placeholder col-4 rounded-pill"></span>
      </h5>
      <h6 class="card-subtitle placeholder-glow mb-2">
        <span class="placeholder col-8 rounded-pill bg-secondary"></span>
      </h6>
      <p class="card-text placeholder-glow">
        <span class="placeholder col-6 rounded-pill"></span>
        <span class="placeholder col-4 rounded-pill"></span>
        <span class="placeholder col-7 rounded-pill"></span>
      </p>
      <a href="#" class="btn btn-primary disabled placeholder col-4"></a>
    </div>
    <div class="card-footer text-muted placeholder-glow">
      <span class="placeholder col-5 rounded-pill"></span>
    </div>
  </div>
</div>`;
}

export function makeAlert (strong, body) {
  return `
<div class="alert alert-danger alert-dismissible fade show m-3 mt-1" role="alert">
  <strong>${strong}</strong> ${body}
  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
</div>`;
}

export function noCardsCard () {
  return `
<div class="col">
  <div class="card h-100">
    <div class="card-body">
      <h5 class="card-title">There are no cards to display :(</h5>
      <p class="card-text">Why not add one using the new post button below?</p>
    </div>
  </div>
</div>`;
}
