console.log('Deferred script loading');

// const textFields = Array.from(document.getElementsByClassName('code-text'));

// standard code highlighting across page
function highlightAllCode () {
  document.querySelectorAll('pre code').forEach((el) => {
    hljs.highlightElement(el);
  });
}

// highlighting live code preview field
const codeInputArea = document.getElementById('newCardCodeInput');
const codePreviewArea = document.getElementById('codeInputPreview');
codeInputArea.addEventListener('input', (e) => {
  codePreviewArea.innerHTML = e.target.value;
  hljs.highlightElement(codePreviewArea);
});

function resetFormCodePreview () {
  codePreviewArea.innerHTML = "print('Hello World')";
  hljs.highlightElement(codePreviewArea);
}

// initial highlighting on DOM load
highlightAllCode();
resetFormCodePreview();

const langSelect = document.getElementById('languageSelect');
hljs.listLanguages().forEach((langName) => {
  const opt = document.createElement('option');
  const capLangName = langName.charAt(0).toUpperCase() + langName.slice(1);
  opt.value = langName;
  opt.innerHTML = capLangName;

  langSelect.appendChild(opt);
});

// todo: change highlighting class on form selection change

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
      apiPOSTUrl = 'http://127.0.0.1:8000/cards';
    } else if (form.id === 'newCommentForm') {
      apiPOSTUrl = 'http://127.0.0.1:8000/comments';
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
      // todo: do reloading page elements stuff for dynamic page
    }
  } finally {
    submitButton.innerHTML = 'Post!';
  }
}

document.getElementById('newCardForm').addEventListener('submit', formSubmitListener);
