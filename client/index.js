console.log('Deferred script loading');

// const textFields = Array.from(document.getElementsByClassName('code-text'));

document.querySelectorAll('pre code').forEach((el) => {
  hljs.highlightElement(el);
});

const codeInputArea = document.getElementById('postCodeInput');
const codePreviewArea = document.getElementById('codeInputPreview');

function highlightCodeInput (newText) {
  codePreviewArea.innerHTML = newText;
  hljs.highlightElement(codePreviewArea);
}

highlightCodeInput(codeInputArea.innerText); // initial highlighting on DOM load

codeInputArea.addEventListener('input', (e) => {
  highlightCodeInput(e.target.value);
});
