// these functions are essentially used for templating html - they use template strings to dynamically return html to embed in the page based on parameters
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

// resets the code preview area to it's default values: language as plaintext and content of print('Hello World')
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

resetFormCodePreview(); // set preview to default state on initial page load

// [src] some of the following form POSTing code is adapted from https://simonplend.com/how-to-use-fetch-to-post-form-data-as-json-to-your-api/

/**
 * @param {String} endpoint API endpoint to use when POSTing (e.g. 'cards')
 * @param {Object} formDataObj Object created from entries of a FormData object's entries
 * @return {Promise<Response>} Promise of response from POST request to API using endpoint and formDataObj (as JSON body) provided
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

// listener to attach to newCardForm submit event - handles submitting the form including:
// communicating with the api, resetting the form element, updating the page, etc.
async function newCardFormSubmitListener (event) {
  event.preventDefault();
  // add loading spinner to button to show user that submission is ongoing
  const submitButton = document.getElementById('newCardSubmit');
  submitButton.innerHTML += ' <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

  const form = event.currentTarget;
  const formData = new FormData(form);
  const formDataObj = Object.fromEntries(formData.entries());

  try {
    const apiResponse = await postFormDataToUrlAsJSON('cards', formDataObj);
    const apiResJSON = await apiResponse.json();

    // pre-emptively create the bootstrap popover to display should the reddit url provided by the user have failed
    const linkFormField = document.getElementById('newCardRedditUrl');
    // bootstrap is loaded in index.html
    // eslint-disable-next-line no-undef
    const linkWarningPopover = new bootstrap.Popover(linkFormField, {
      title: 'Reddit Link Failed',
      content: apiResJSON.message + ' e.g. https://www.reddit.com/r/adventofcode/comments/rgqzt5/comment/hpfhlkk/',
      trigger: 'focus' // the popover is shown when linkFormField is focused by the user
    });

    if (!apiResponse.ok) {
      if (apiResJSON.error === 'reddit-url-failed') {
        linkWarningPopover.show(); // show the popover if the reddit link failed to validate
      }
    } else {
      // Who knows why this doesn't work - pulled my hair out tyring to get it do so...
      // const newCardModal = new bootstrap.Modal(document.getElementById('newCardModal'));
      // newCardModal.hide();
      // I suppose we'll just manually click the close button instead via js
      document.getElementById('newCardFormModalCloseButton').click();

      // clear form's values and reset code preview
      form.reset();
      resetFormCodePreview();
      linkWarningPopover.dispose(); // delete the popover element - we don't need it cluttering the DOM
      updatePageCards(); // update the page's cards so the user can see their new card!
    }
  } catch (e) { // catches any CONNECTION REFUSED (i.e. server disconnect) errors and informs user via a Bootstrap Alert element
    const newCardFormAlertDiv = document.getElementById('formErrorAlert');
    newCardFormAlertDiv.innerHTML = makeAlert(
      'Card creation failed!',
      'You might have lost connection to the server.'
    );
  } finally { // in any case, reset the button's text to remove the loading spinner since the action has now completed
    submitButton.innerHTML = 'Submit!';
  }
}

// listener to attach to each comment form's submit event - handles submitting these form including:
// communicating with the api, resetting the form element, updating the comments section of the card, etc.
async function newCommentFormSubmitListener (event) {
  event.preventDefault();
  const form = event.currentTarget;

  const parentCardId = Number(form.id.match(/\d+/g)[0]); // retrieve the id of the card the comment is associated with from the form's id attribute
  // add loading spinner to relevant submit button to show user that submission is ongoing
  const postButton = document.getElementById(`commentPostButton-${parentCardId}`);
  postButton.innerHTML += ' <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

  const formData = new FormData(form);
  /** @type {{[prop: String]: String | Number}} formDataObj */
  const formDataObj = Object.fromEntries(formData.entries());
  formDataObj.parent = parentCardId; // add in the parent property - needed for the POST request's body

  try {
    const apiResponse = await postFormDataToUrlAsJSON('comments', formDataObj);
    const apiResponseJSON = await apiResponse.json();

    // gets comment count element from card on main page (the element with the forum speech bubbles and a number indicating comment count)
    const commentDisplayedCount = document.getElementById(`card-${parentCardId}-commentCount`);
    // replace digits after nbsp's semi-colon with new comment total
    commentDisplayedCount.innerHTML = commentDisplayedCount.innerHTML.replace(/;\d+/, `;${apiResponseJSON.newTotalComments}`);

    // if POSTing was successful reload the comments shown on the current card reset the form
    updateCommentsByCard(parentCardId);
    form.reset();
  } catch (e) { // catches any CONNECTION REFUSED (i.e. server disconnect) errors and informs user via a Bootstrap Alert element underneath comment form
    const commentAlertDiv = document.getElementById(`commentAlert${parentCardId}`);
    commentAlertDiv.innerHTML = makeAlert(
      'Comment post failed!',
      'You might have lost connection to the server.'
    );
  } finally {
    postButton.innerHTML = 'Post!';
  }
}

// add the submit listener to the new card form
document.getElementById('newCardForm').addEventListener('submit', newCardFormSubmitListener);

// these elements will be dynamically updated by the js in this file based on user interactions
const documentCardsDiv = document.getElementById('cards');
const documentCardModalsDiv = document.getElementById('cardModals');
const sortSelector = document.getElementById('sortingOption');

// these caches are used to save cards/comments from last successful GET to be served in case of server disconnect
let cardArrayCache = [];
const commentCache = {};
const pageAlertDiv = document.getElementById('pageErrorAlert'); // this alert div is used to display errors while loading cards etc.

/**
 * @param {String} sortBy card property to sort by - one of: comments, likes, time
 * @return {Promise<Object[]>} Promise of array of card objects to place onto the page as desired, sorted by sortBy parameter in ascending order
 */
async function getAllCards (sortBy) {
  let currentCardArray = []; // this is the array that will be sorted and then placed on the page
  try {
    const apiResponse = await fetch('cards');
    currentCardArray = await apiResponse.json();
    for (const card of currentCardArray) {
      /** @type {DateTime} */
      card.time = DateTime.fromISO(card.time); // convert to DateTime object so that times can be compared and sorted below
    }
    cardArrayCache = currentCardArray; // update the cache with the newly fetched card data
  } catch (e) { // on connection refusal/disconnect, update the pageAlertDiv with the error and display the cached cards instead
    pageAlertDiv.innerHTML = makeAlert(
      'Card update failed!',
      'You might have lost connection to the server. Any cards shown may be outdated.'
    );

    currentCardArray = cardArrayCache;
  }

  // adds a function property to currentCardArray that sorts it in-place in ascending order depending on sortParameter:
  // old to resent; lowest likes to highest; least comments to most
  currentCardArray.sortBy = function (sortParameter) {
    // Custom compare function https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#description
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

/**
 * @param {Object[]} cardArray Array of card objects to insert onto the page
 */
function insertCardsOnPage (cardArray) {
  documentCardsDiv.innerHTML = ''; // clear the cards div ready to be populated
  documentCardModalsDiv.innerHTML = ''; // similarly, clear the associated modals div

  if (cardArray.length > 0) { // more than one card to add to the page
    for (const card of cardArray) { // iteratively add each card and its associated modal to the page
      const relativeTime = card.time.toRelative();
      const exactTime = card.time.toLocaleString(TIMESTRINGFORMAT);

      const langUpper = firstLetterUpper(card.language); // capitalise language for display

      // add card and associated modal to the html
      documentCardsDiv.innerHTML = makeCardBlock(
        card.title, langUpper, card.code, card.id, card.likes,
        card.comments.length, relativeTime, exactTime
      ) + documentCardsDiv.innerHTML; // cardArray is in ascending order so the 'lowest' cards are added first with 'bigger' cards added in front

      documentCardModalsDiv.innerHTML = makeCardModalBlock(
        card.id, card.title, langUpper, card.code, card.redditUrl,
        card.redditData.score, card.redditData.author, card.redditData.replies
      ) + documentCardModalsDiv.innerHTML;
    }

    // select all the 'See more' buttons in the button cards and add an event listener to each that updates that card's comments when clicked
    documentCardsDiv.querySelectorAll('button').forEach((el) => {
      el.addEventListener('click', () => {
        const cardId = el.getAttribute('data-bs-target').match(/\d+/)[0];
        updateCommentsByCard(cardId);
      });
    });
  } else { // no cards exist to add so add a placeholder card in an adapted grid layout
    documentCardsDiv.className = 'row row-cols-1';
    documentCardsDiv.innerHTML = makeNoCardsCard();
  }
}

// refresh the cards shown on the page by fetching from the api
function updatePageCards () {
  documentCardsDiv.className = 'row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-4'; // establish grid layout on main page
  documentCardsDiv.innerHTML = makePlaceholderCardBlock().repeat(3); // add 3 placeholder cards to grid while fetching cards
  pageAlertDiv.innerHTML = ''; // clear any previous messages in the alert div

  // get all cards sorted by the current value of sortSelector
  getAllCards(sortSelector.value).then((cardArray) => {
    insertCardsOnPage(cardArray); // insert the cards returned by getAllCards(...) onto the page
    highlightAllCode(); // highlight all code on the page, specifically including each card's code preview and code in its modal
    // add a submit event listener to all the new comment forms within each modal
    document.querySelectorAll('.comment-form').forEach(el => el.addEventListener('submit', newCommentFormSubmitListener));
  });
}

sortSelector.addEventListener('change', updatePageCards); // update the page's cards every time sort by preference is changed by the user in sortSelector
updatePageCards(); // initial card update on page load

/**
 * @param {String | Number} cardId id of card to retrieve comments for
 * @return {Promise<Object[]>} Promise of comment objects to add to the card as desired
 */
async function getCommentsByCard (cardId) {
  // clear any previous messages from the alert div
  const commentAlertDiv = document.getElementById(`commentAlert${cardId}`);
  commentAlertDiv.innerHTML = '';

  // updates commentCache[cardId] if possible
  try {
    // fetch the array of comment ids associated with cardId
    let apiResponse = await fetch(`cards/${cardId}`);
    let apiResponseJSON = await apiResponse.json();
    const reqComments = apiResponseJSON.comments;

    if (reqComments.length > 0) {
      // fetch those comments also via the api
      apiResponse = await fetch(`comments?ids=${reqComments.join()}`);
      apiResponseJSON = await apiResponse.json();

      // fun fact: js doesn't care if cardId is a Number or a String representing a Number
      // it just converts it to a Number regardless :/
      commentCache[cardId] = apiResponseJSON;
    } else { // there are no comments associated with this card
      commentCache[cardId] = [];
    }
  } catch (e) { // catches connection refusal/server disconnect and notifies user
    commentAlertDiv.innerHTML = makeAlert(
      'Comment loading failed!',
      'You might have lost connection to the server. Any comments shown may be outdated.'
    );
    // this will mean that the previous state of the commentCache is returned
  }
  // return the comments associated to cardId from the comment cache
  return commentCache[cardId];
}

// update all displayed comments of a card with specified cardId
function updateCommentsByCard (cardId) {
  // retrieve the relevant <ul> element out of the card modals
  const commentsULEl = document.getElementById(`card-${cardId}-CommentsList`);
  // add loading icon to comments section while comments section is being fetched
  commentsULEl.innerHTML = `<div class="d-flex justify-content-center">
  <div class="spinner-border" role="status">
    <span class="visually-hidden">Loading comments...</span>
  </div>
</div>`;

  // get the relevant comments array and then pass this on to be inserted onto the page
  getCommentsByCard(cardId).then((commentArray) => {
    commentsULEl.innerHTML = ''; // clear loading spinner
    if (commentArray.length > 0) {
      for (const comment of commentArray) { // add each comment as its own <li> element to the list
        /** @type {DateTime} */
        comment.time = DateTime.fromISO(comment.time);

        let timeDetailString;
        if (comment.lastEdited) {
          /** @type {DateTime} */
          comment.lastEdited = DateTime.fromISO(comment.lastEdited);
          timeDetailString = `Edited ${comment.lastEdited.toLocaleString(TIMESTRINGFORMAT)}`;
        } else { // comment has not been edited
          timeDetailString = comment.time.toLocaleString(TIMESTRINGFORMAT);
        }

        commentsULEl.innerHTML += makeSingleCommentLiElement(comment.id, comment.content, comment.time.toRelative(), timeDetailString);
      }

      // select all the pencil icon links (<a>) in the comments that were just added and add a one-time 'flip-flop' edit event listener to them on click
      commentsULEl.querySelectorAll('a').forEach((anchorEl) => {
        anchorEl.addEventListener('click', () => editCommentListener(anchorEl), { once: true });
      });
    } else { // no comments exist so add an explainer <li> element to add to <ul>
      commentsULEl.innerHTML += makeSingleCommentLiElement(null, 'No comments yet!', null);
    }
  });
}

/**
 * @param {String} commentId the id of the comment to be updated with newContent
 * @param {String} newContent the edited full text of the comment - the api will attempt to be update the comment's content property to this value
 * @return {Promise<Boolean>} Promise of boolean of whether or not the PUT was successful
 */
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
    return true;
  } catch (e) { // catches connection refusal/disconnect and returns false to signify that the operation failed
    return false;
  }
}

// listener to attach to an anchor element to trigger an edit-like action
function editCommentListener (anchorEl) {
  // get required ids
  const commentId = anchorEl.id.match(/\d+/)[0]; // retrieve the relevant comment id from the anchor's id
  const cardId = anchorEl.closest('ul').id.match(/\d+/)[0]; // retrieve the parent card's id from the encompassing <ul> element

  // get the actual text of the comment next to the pencil icon anchor
  const contentDiv = anchorEl.closest('.list-group-item').querySelector('.comment-content');
  const oldContentCache = contentDiv.innerText; // cache the comment's old content in case the PUT fails
  // make the comment text editable and focus it to highlight this fact
  contentDiv.contentEditable = 'true';
  contentDiv.focus();

  // change the grey (secondary) pencil icon (edit) to a green (success) tick icon (done)
  anchorEl.innerHTML = anchorEl.innerHTML.replace(/edit/, 'done').replace(/secondary/, 'success');
  anchorEl.title = 'Done!'; // also, update the on hover title

  // add an event listener to this new tick icon ready to capture click when the user is done editing
  // this is the second part of the one-time 'flip-flop' listener and also has { once: true } for its options parameter
  anchorEl.addEventListener('click', () => {
    contentDiv.contentEditable = 'false'; // make content no longer editable

    // revert the icon changes made above again
    anchorEl.innerHTML = anchorEl.innerHTML.replace(/done/, 'edit').replace(/success/, 'secondary');
    anchorEl.title = 'Edit comment';

    // actually attempt to put the new comment
    putComment(commentId, contentDiv.innerText).then((putWasSuccess) => {
      if (putWasSuccess) { // PUT success so refresh the comments (which will now include the updated content)
        updateCommentsByCard(cardId);
      } else { // comment update failed, so display the old cached content instead and show an error
        const alertDiv = document.getElementById(`commentAlert${cardId}`);
        alertDiv.innerHTML = makeAlert(
          'Comment edit failed!',
          'You might have lost connection to the server. Try editing the comment again later.'
        );
        contentDiv.textContent = oldContentCache;
      }

      // re-add the one-time 'flip-flop' click event listener to the pencil icon again to restart this whole cycle again when the user clicks the pencil
      anchorEl.addEventListener('click', () => editCommentListener(anchorEl), { once: true });
    });
  }, { once: true });
}
