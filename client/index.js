import {
  makeAlert,
  makeCardBlock,
  makeCardModalBlock,
  makeNoCardsCard,
  makePlaceholderCardBlock,
  makeSingleCommentLiElement
} from './tagGen.js';

// luxon is loaded in index.html
// eslint-disable-next-line no-undef
const DateTime = luxon.DateTime;
const TIMESTRINGFORMAT = { // format to use for short time string hover text
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  day: '2-digit',
  month: '2-digit',
  year: '2-digit'
};

/**
 * [src] function taken from https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript
 * @param {String} s
 * @return {String} s with the first character capitalised
 */
function firstLetterUpper (s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// highlights all pre code elements on the page using highlight.js
function highlightAllCode () {
  document.querySelectorAll('pre code').forEach((el) => {
    hljs.highlightElement(el);
  });
}

// gets elements from page related to code preview area language selection, input and live formatted preview
const codePreviewLangSelect = document.getElementById('languageSelect');
const codeInputArea = document.getElementById('newCardCodeInput');
const codePreviewArea = document.getElementById('codeInputPreview');

// Updates the code preview area's class name and text content from input
// then highlights using highlight.js and language specified in select menu
function updateCodeInputArea () {
  let selectedLang = codePreviewLangSelect.value; // gets value of currently selected language
  if (!selectedLang) { // if default "" value selected, just set language as plaintext
    selectedLang = 'plaintext';
  }
  codePreviewArea.className = `code-text language-${selectedLang} p-2 rounded-3`;
  codePreviewArea.innerHTML = codeInputArea.value;
  hljs.highlightElement(codePreviewArea);
}

// Resets the code preview area to it's default values: language as plaintext and content of print('Hello World')
function resetFormCodePreview () {
  codePreviewArea.className = 'code-text language-plaintext p-2 rounded-3';
  codePreviewArea.innerHTML = "print('Hello World')";
  hljs.highlightElement(codePreviewArea);
}

codeInputArea.addEventListener('input', updateCodeInputArea); // update contents of preview area and highlighting when new text is input

// adds all available languages (where highlighting is supported) to select dropdown
hljs.listLanguages().forEach((langName) => {
  const opt = document.createElement('option');
  opt.value = langName; // store value as langName directly from hljs to use to update class name (see updateCodeInputArea())
  opt.innerHTML = firstLetterUpper(langName);
  codePreviewLangSelect.appendChild(opt); // add new newly generated option to selection menu
});
codePreviewLangSelect.addEventListener('change', updateCodeInputArea); // update highlighting when the language selected is changed

resetFormCodePreview(); // set preview to default state on page load

// [src] some of the following form POSTing code is adapted from https://simonplend.com/how-to-use-fetch-to-post-form-data-as-json-to-your-api/

/**
 * @param {String} endpoint API endpoint to use when POSTing (e.g. 'cards')
 * @param {Object} formDataObj Object created from entries of a FormData object's entries
 */
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
      updatePageCards();
    }
  } catch (e) {
    const alertDiv = document.getElementById('formErrorAlert');
    alertDiv.innerHTML = makeAlert(
      'Card creation failed!',
      'You might have lost connection to the server.'
    );
  } finally {
    submitButton.innerHTML = 'Submit!';
  }
}

async function newCommentFormSubmitListener (event) {
  event.preventDefault();
  const form = event.currentTarget;

  const parentId = Number(form.id.match(/\d+/g)[0]);
  const postButton = document.getElementById(`commentPostButton-${parentId}`);
  postButton.innerHTML += ' <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

  const formData = new FormData(form);
  const formDataObj = Object.fromEntries(formData.entries());
  formDataObj.parent = parentId;

  try {
    const apiResponse = await postFormDataToUrlAsJSON('comments', formDataObj);
    const apiResponseJSON = await apiResponse.json();

    const commentDisplayedCount = document.getElementById(`card-${parentId}-commentCount`);
    commentDisplayedCount.innerHTML = commentDisplayedCount.innerHTML.replace(/;\d+/, `;${apiResponseJSON.newTotalComments}`);
    updateCommentsByCard(parentId);
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

// add the submit listener to the new card form
document.getElementById('newCardForm').addEventListener('submit', newCardFormSubmitListener);

const documentCards = document.getElementById('cards');
const documentCardModals = document.getElementById('cardModals');
const sortSelector = document.getElementById('sortingOption');

// These caches are used to save cards/comments from last successful GET to be served in case of server disconnect
let cardArrayCache = [];
const commentCache = {};

async function getAllCards (sortBy) {
  documentCards.className = 'row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-4';
  documentCards.innerHTML = makePlaceholderCardBlock().repeat(3);

  const alertDiv = document.getElementById('pageErrorAlert');
  alertDiv.innerHTML = '';

  let currentCardArray = [];
  try {
    const apiResponse = await fetch('cards');
    currentCardArray = await apiResponse.json();
    for (const card of currentCardArray) {
      // convert to DateTime object so that times can be compared and sorted
      /** @type {DateTime} */
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
      const exactTime = card.time.toLocaleString(TIMESTRINGFORMAT);

      const langUpper = firstLetterUpper(card.language);

      documentCards.innerHTML = makeCardBlock(
        card.title, langUpper, card.code, card.id, card.likes,
        card.comments.length, relativeTime, exactTime
      ) + documentCards.innerHTML;

      documentCardModals.innerHTML = makeCardModalBlock(
        card.id, card.title, langUpper, card.code, card.redditUrl,
        card.redditData.score, card.redditData.author, card.redditData.replies
      ) + documentCardModals.innerHTML;
    }

    documentCards.querySelectorAll('button').forEach((el) => {
      el.addEventListener('click', () => {
        updateCommentsByCard(el.getAttribute('data-bs-target').match(/\d+/)[0]);
      });
    });
  } else {
    documentCards.innerHTML = makeNoCardsCard();
    documentCards.className = 'row row-cols-1';
  }
}

function updatePageCards () {
  getAllCards(sortSelector.value).then((cardArray) => {
    insertCardsOnPage(cardArray);
    highlightAllCode();
    document.querySelectorAll('.comment-form').forEach(el => el.addEventListener('submit', newCommentFormSubmitListener));
  });
}

sortSelector.addEventListener('change', updatePageCards);
updatePageCards();

async function getCommentsByCard (cardId) {
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

function updateCommentsByCard (cardId) {
  const commentsULEl = document.getElementById(`card-${cardId}-CommentsList`);
  commentsULEl.innerHTML = `<div class="d-flex justify-content-center">
  <div class="spinner-border" role="status">
    <span class="visually-hidden">Loading comments...</span>
  </div>
</div>`;

  getCommentsByCard(cardId).then((commentArray) => {
    commentsULEl.innerHTML = '';
    if (commentArray.length > 0) {
      for (const comment of commentArray) {
        /** @type {DateTime} */
        comment.time = DateTime.fromISO(comment.time);

        let timeDetailString = '';
        if (comment.lastEdited) {
          /** @type {DateTime} */
          comment.lastEdited = DateTime.fromISO(comment.lastEdited);
          timeDetailString = `Edited ${comment.lastEdited.toLocaleString(TIMESTRINGFORMAT)}`;
        } else {
          timeDetailString = comment.time.toLocaleString(TIMESTRINGFORMAT);
        }

        commentsULEl.innerHTML += makeSingleCommentLiElement(comment.id, comment.content, comment.time.toRelative(), timeDetailString);
      }
      commentsULEl.querySelectorAll('a').forEach((el) => {
        el.addEventListener('click', () => editCommentListener(el), { once: true });
      });
    } else {
      commentsULEl.innerHTML += makeSingleCommentLiElement(null, 'No comments yet!', null);
    }
  });
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

function editCommentListener (linkEl) {
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
        updateCommentsByCard(cardId);
      }

      linkEl.addEventListener('click', () => editCommentListener(linkEl), { once: true });
    });
  }, { once: true });
}
