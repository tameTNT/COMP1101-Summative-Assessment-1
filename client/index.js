import {
  commentLiElement,
  makeAlert,
  makeCardHTMLBlock,
  makeCardModalHTMLBlock,
  noCardsCard,
  placeholderCard
} from './tagGen.js';

// eslint-disable-next-line no-undef
const DateTime = luxon.DateTime;
const TIMESTRINGFORMAT = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  day: '2-digit',
  month: '2-digit',
  year: '2-digit'
};

// standard code highlighting across page
function highlightAllCode () {
  document.querySelectorAll('pre code').forEach((el) => {
    hljs.highlightElement(el);
  });
}

// highlighting live code preview field
const codeInputArea = document.getElementById('newCardCodeInput');
const codePreviewArea = document.getElementById('codeInputPreview');
const codePreviewLangSelect = document.getElementById('languageSelect');

function updateCodeInputArea () {
  let selectedLang = codePreviewLangSelect.value;
  if (!selectedLang) { // if default "" value selected
    selectedLang = 'plaintext';
  }
  codePreviewArea.className = `code-text language-${selectedLang} p-2 rounded-3`;
  codePreviewArea.innerHTML = codeInputArea.value;
  hljs.highlightElement(codePreviewArea);
}

codeInputArea.addEventListener('input', updateCodeInputArea);
codePreviewLangSelect.addEventListener('change', updateCodeInputArea);

function resetFormCodePreview () {
  codePreviewArea.className = 'code-text language-plaintext p-2 rounded-3';
  codePreviewArea.innerHTML = "print('Hello World')";
  hljs.highlightElement(codePreviewArea);
}

async function postFormDataToUrlAsJSON (endpoint, formDataObj) {
  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(formDataObj)
  };

  return await fetch(endpoint, fetchOptions);
}

async function newCardFormSubmitListener (event) {
  event.preventDefault();
  const submitButton = document.getElementById('newCardSubmit');
  submitButton.innerHTML += ' <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

  const form = event.currentTarget;
  const formData = new FormData(form);
  const formDataObj = Object.fromEntries(formData.entries());

  try {
    const apiResponse = await postFormDataToUrlAsJSON('cards', formDataObj);
    const apiResJSON = await apiResponse.json();

    const linkFormField = document.getElementById('newCardRedditUrl');
    // eslint-disable-next-line no-undef
    const linkWarningPopover = new bootstrap.Popover(linkFormField, {
      title: 'Reddit Link Failed',
      content: apiResJSON.message + ' e.g. https://www.reddit.com/r/adventofcode/comments/rgqzt5/comment/hpfhlkk/',
      trigger: 'focus'
    });

    if (!apiResponse.ok) {
      switch (apiResJSON.error) {
        case 'reddit-link-failed':
          linkWarningPopover.show();
      }
    } else {
      // Who knows why this doesn't work - pulled my hair out tyring to get it do so...
      // const newCardModal = new bootstrap.Modal(document.getElementById('newCardModal'));
      // newCardModal.hide();
      document.getElementById('newCardFormModalCloseButton').click();
      form.reset(); // clear form values and reset code preview
      resetFormCodePreview();
      linkWarningPopover.dispose();
      updateCards();
    }
  } catch (e) {
    const alertDiv = document.getElementById('formErrorAlert');
    alertDiv.innerHTML = makeAlert(
      'Post creation failed!',
      'You might have lost connection to the server.'
    );
  } finally {
    submitButton.innerHTML = 'Post!';
  }
}

document.getElementById('newCardForm').addEventListener('submit', newCardFormSubmitListener);

async function newCommentFormSubmitListener (event) {
  event.preventDefault();
  const form = event.currentTarget;

  const parentId = Number(form.id.match(/\d+/g)[0]);
  const postButton = document.getElementById(`commentPostButton${parentId}`);
  postButton.innerHTML += ' <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

  const formData = new FormData(form);
  const formDataObj = Object.fromEntries(formData.entries());
  formDataObj.parent = parentId;

  try {
    const apiResponse = await postFormDataToUrlAsJSON('comments', formDataObj);
    const apiResponseJSON = await apiResponse.json();

    const commentDisplayedCount = document.getElementById(`post${parentId}CommentCount`);
    commentDisplayedCount.innerHTML = commentDisplayedCount.innerHTML.replace(/;\d+/, `;${apiResponseJSON.newTotalComments}`);
    updateComments(parentId);
    form.reset();
  } catch (e) {
    const alertDiv = document.getElementById(`commentAlert${parentId}`);
    alertDiv.innerHTML = makeAlert(
      'Comment post failed!',
      'You might have lost connection to the server.'
    );
  } finally {
    postButton.innerHTML = 'Post!';
  }
}

/**
 * @param {string} string
 */
function firstLetterUpper (string) {
  // src: https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const langSelect = document.getElementById('languageSelect');
hljs.listLanguages().forEach((langName) => {
  const opt = document.createElement('option');
  const capLangName = firstLetterUpper(langName);
  opt.value = langName;
  opt.innerHTML = capLangName;

  langSelect.appendChild(opt);
});

const documentCards = document.getElementById('cards');
const documentCardModals = document.getElementById('postModals');
const sortSelector = document.getElementById('sortingOption');

let cardArrayCache = [];

async function getAllCards (sortBy) {
  documentCards.className = 'row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4';
  documentCards.innerHTML = placeholderCard().repeat(3);

  const alertDiv = document.getElementById('pageErrorAlert');
  alertDiv.innerHTML = '';

  let currentCardArray = [];
  try {
    const apiResponse = await fetch('cards');
    currentCardArray = await apiResponse.json();
    for (const card of currentCardArray) {
      // convert to DateTime object so that times can be compared and sorted
      card.time = DateTime.fromISO(card.time);
    }
    cardArrayCache = currentCardArray;
  } catch (e) {
    alertDiv.innerHTML = makeAlert(
      'Card update failed!',
      'You might have lost connection to the server. Any cards shown may be outdated.'
    );

    currentCardArray = cardArrayCache;
  }

  // sorts in descending order - recent to old; highest likes to lowest
  currentCardArray.sortBy = function (sortParameter) {
    function compare (a, b) {
      let left;
      let right;
      if (sortParameter === 'comments') {
        left = a[sortParameter].length;
        right = b[sortParameter].length;
      } else {
        left = a[sortParameter];
        right = b[sortParameter];
      }

      if (left < right) {
        return -1;
      }
      if (left > right) {
        return 1;
      }
      return 0;
    }

    this.sort(compare);
  };
  currentCardArray.sortBy(sortBy);
  return currentCardArray;
}

function insertCardsOnPage (cardArray) {
  documentCards.innerHTML = '';
  documentCardModals.innerHTML = '';

  if (cardArray.length > 0) {
    for (const card of cardArray) {
      const relativeTime = card.time.toRelative();
      // noinspection JSCheckFunctionSignatures
      const exactTime = card.time.toLocaleString(TIMESTRINGFORMAT);

      const langUpper = firstLetterUpper(card.language);

      documentCards.innerHTML = makeCardHTMLBlock(
        card.title, langUpper, card.code, card.id, card.likes,
        card.comments.length, relativeTime, exactTime
      ) + documentCards.innerHTML;

      documentCardModals.innerHTML = makeCardModalHTMLBlock(
        card.id, card.title, langUpper, card.code, card.redditUrl,
        card.redditData.score, card.redditData.author, card.redditData.numSubComments
      ) + documentCardModals.innerHTML;
    }

    documentCards.querySelectorAll('button').forEach((el) => {
      el.addEventListener('click', () => {
        updateComments(el.getAttribute('data-bs-target').match(/\d+/)[0]);
      });
    });
  } else {
    documentCards.innerHTML = noCardsCard();
    documentCards.className = 'row row-cols-1';
  }
}

function getAllCardsCallback (cardArray) {
  insertCardsOnPage(cardArray);
  highlightAllCode();
  resetFormCodePreview();
  document.querySelectorAll('.comment-form').forEach(el => el.addEventListener('submit', newCommentFormSubmitListener));
}

function updateCards () {
  getAllCards(sortSelector.value).then((cardArray) => getAllCardsCallback(cardArray));
}

const commentCache = Object();

async function getComments (cardId) {
  const alertDiv = document.getElementById(`commentAlert${cardId}`);
  alertDiv.innerHTML = '';

  try {
    let apiResponse = await fetch(`cards/${cardId}`);
    let apiResponseJSON = await apiResponse.json();
    const reqComments = apiResponseJSON.comments;

    if (reqComments.length > 0) {
      apiResponse = await fetch(`comments?ids=${reqComments.join()}`);
      apiResponseJSON = await apiResponse.json();
      commentCache[cardId] = apiResponseJSON;
    } else {
      commentCache[cardId] = [];
    }
  } catch (e) {
    alertDiv.innerHTML = makeAlert(
      'Comment loading failed!',
      'You might have lost connection to the server. Any comments shown may be outdated.'
    );
  }
  return commentCache[cardId];
}

function updateComments (cardId) {
  const commentsULEl = document.getElementById(`card${cardId}CommentsList`);
  commentsULEl.innerHTML = `<div class="d-flex justify-content-center">
  <div class="spinner-border" role="status">
    <span class="visually-hidden">Loading comments...</span>
  </div>
</div>`;

  getComments(cardId).then((commentArray) => {
    commentsULEl.innerHTML = '';
    if (commentArray.length > 0) {
      for (const comment of commentArray) {
        comment.time = DateTime.fromISO(comment.time);

        let timeDetailString = '';
        if (comment.lastEdited) {
          comment.lastEdited = DateTime.fromISO(comment.lastEdited);
          // noinspection JSCheckFunctionSignatures
          timeDetailString = `Edited ${comment.lastEdited.toLocaleString(TIMESTRINGFORMAT)}`;
        } else {
          // noinspection JSCheckFunctionSignatures
          timeDetailString = comment.time.toLocaleString(TIMESTRINGFORMAT);
        }

        commentsULEl.innerHTML += commentLiElement(comment.id, comment.content, comment.time.toRelative(), timeDetailString);
      }
      commentsULEl.querySelectorAll('a').forEach((el) => {
        el.addEventListener('click', () => editCommentAction(el), { once: true });
      });
    } else {
      commentsULEl.innerHTML += commentLiElement(null, 'No comments yet!', null);
    }
  });
}

sortSelector.addEventListener('change', updateCards);
updateCards();

function editCommentAction (linkEl) {
  const commentId = linkEl.id.match(/\d+/)[0];
  const cardId = linkEl.closest('ul').id.match(/\d+/)[0];
  const contentDiv = linkEl.closest('.list-group-item').querySelector('.comment-content');
  const oldContentCache = contentDiv.innerText;
  contentDiv.contentEditable = 'true';
  linkEl.innerHTML = linkEl.innerHTML.replace(/edit/, 'done').replace(/secondary/, 'success');
  linkEl.title = 'Done!';

  contentDiv.focus();

  linkEl.addEventListener('click', () => {
    contentDiv.contentEditable = 'false';
    linkEl.innerHTML = linkEl.innerHTML.replace(/done/, 'edit').replace(/success/, 'secondary');
    linkEl.title = 'Edit comment';
    contentDiv.innerText = contentDiv.innerText.replace('\n', ' ');

    putComment(commentId, contentDiv.innerText).then((statusStr) => {
      if (statusStr === 'FAIL') {
        const alertDiv = document.getElementById(`commentAlert${cardId}`);
        alertDiv.innerHTML = makeAlert(
          'Comment edit failed!',
          'You might have lost connection to the server. Try editing the comment again later.'
        );
        contentDiv.textContent = oldContentCache;
      } else {
        updateComments(cardId);
      }

      linkEl.addEventListener('click', () => editCommentAction(linkEl), { once: true });
    });
  }, { once: true });
}

async function putComment (commentId, newContent) {
  const fetchOptions = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ content: newContent })
  };

  try {
    await fetch(`comments/${commentId}`, fetchOptions);
    return 'OK';
  } catch (e) {
    return 'FAIL';
  }
}
