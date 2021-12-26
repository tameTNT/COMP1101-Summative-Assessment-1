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

// initial highlighting on DOM load
highlightAllCode();
codePreviewArea.innerHTML = "print('Hello World')";
hljs.highlightElement(codePreviewArea);

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

  await fetch(url, fetchOptions);
}

async function formSubmitListener (event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  let apiPOSTUrl = '';
  if (form.id === 'newCardForm') {
    apiPOSTUrl = 'http://127.0.0.1:8000/cards';
  } else if (form.id === 'newCommentForm') {
    apiPOSTUrl = 'http://127.0.0.1:8000/comments';
  }

  try {
    await postFormDataToUrlAsJSON(apiPOSTUrl, formData);
  } catch (error) {
    console.error(error);
  }

  // Who knows why this doesn't work - pulled my hair out tyring to get it do so...
  // const newCardModal = new bootstrap.Modal(document.getElementById('newCardModal'));
  // newCardModal.hide();
  document.getElementById('newCardFormModalCloseButton').click();
  form.reset(); // clear form values
  // todo: do reloading page elements stuff for dynamic page
}

document.getElementById('newCardForm').addEventListener('submit', formSubmitListener);
