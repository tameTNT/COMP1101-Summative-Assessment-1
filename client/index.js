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
