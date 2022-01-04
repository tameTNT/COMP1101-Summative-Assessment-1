import {
  makeAlert,
  makeCardHTMLBlock,
  makeCardModalHTMLBlock,
  noCardsCard,
  placeholderCard
} from './tagGen.js';

// eslint-disable-next-line no-undef
const DateTime = luxon.DateTime;

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
  codePreviewArea.className = `code-text language-${selectedLang} p-2`;
  codePreviewArea.innerHTML = codeInputArea.value;
  hljs.highlightElement(codePreviewArea);
}

codeInputArea.addEventListener('input', updateCodeInputArea);
codePreviewLangSelect.addEventListener('change', updateCodeInputArea);

function resetFormCodePreview () {
  codePreviewArea.className = 'code-text language-plaintext p-2';
  codePreviewArea.innerHTML = "print('Hello World')";
  hljs.highlightElement(codePreviewArea);
}

async function postFormDataToUrlAsJSON (url, formData) {
  const plainData = Object.fromEntries(formData.entries());
  const formDataJSONString = JSON.stringify(plainData);

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: formDataJSONString
  };

  return await fetch(url, fetchOptions);
}

async function formSubmitListener (event) {
  const submitButton = document.getElementById('newCardSubmit');
  try {
    event.preventDefault();

    submitButton.innerHTML += ' <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

    const form = event.currentTarget;
    const formData = new FormData(form);

    let apiPOSTUrl = '';
    if (form.id === 'newCardForm') {
      apiPOSTUrl = 'cards';
    } else if (form.id === 'newCommentForm') {
      apiPOSTUrl = 'comments';
    }

    const apiResponse = await postFormDataToUrlAsJSON(apiPOSTUrl, formData);
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

document.getElementById('newCardForm').addEventListener('submit', formSubmitListener);

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

let cardArrayTemp = [];

async function getAllCards (sortBy) {
  documentCards.className = 'row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4';
  documentCards.innerHTML = placeholderCard().repeat(3);

  let currentCardArray = [];
  try {
    const apiResponse = await fetch('cards');
    currentCardArray = await apiResponse.json();
    for (const card of currentCardArray) {
      // convert to DateTime object so that times can be compared and sorted
      card.time = DateTime.fromISO(card.time);
    }
    // sorts in descending order - recent to old; highest likes to lowest
    cardArrayTemp = currentCardArray;
  } catch (e) {
    const alertDiv = document.getElementById('pageErrorAlert');
    alertDiv.innerHTML = makeAlert(
      'Card update failed!',
      'You might have lost connection to the server. The cards shown may be outdated.'
    );

    currentCardArray = cardArrayTemp;
  }

  currentCardArray.sortBy = function (sortParameter) {
    function compare (a, b) {
      const left = a[sortParameter];
      const right = b[sortParameter];

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

  if (cardArray.length === 0) {
    documentCards.innerHTML = noCardsCard();
    documentCards.className = 'row row-cols-1';
  } else {
    for (const card of cardArray) {
      const relativeTime = card.time.toRelative();
      // noinspection JSCheckFunctionSignatures
      const exactTime = card.time.toLocaleString({
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });

      const langUpper = firstLetterUpper(card.language);

      documentCards.innerHTML = makeCardHTMLBlock(
        // todo: actually count comments for commentNum label
        card.title, langUpper, card.code, card.id, card.likes,
        0, relativeTime, exactTime
      ) + documentCards.innerHTML;

      documentCardModals.innerHTML = makeCardModalHTMLBlock(
        card.id, card.title, langUpper, card.code, card.redditUrl,
        card.redditData.score, card.redditData.author, card.redditData.numSubComments
      ) + documentCardModals.innerHTML;
    }
  }
}

function getAllCardsCallback (cardArray) {
  insertCardsOnPage(cardArray);
  highlightAllCode();
  resetFormCodePreview();
}

function updateCards () {
  getAllCards(sortSelector.value).then((cardArray) => getAllCardsCallback(cardArray));
}

sortSelector.addEventListener('change', updateCards);
updateCards();
