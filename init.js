// Security: event listeners moved from index.html inline script to prevent unsafe-inline CSP requirement
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('contextmenu', e => {
  // Allow native copy/paste menu in form fields
  if (e.target.closest('input, textarea, [contenteditable]')) return;
  e.preventDefault();
});
// Prevent text selection on non-input elements
document.addEventListener('selectstart', e => {
  if (!e.target.closest('input, textarea, [contenteditable]')) {
    e.preventDefault();
  }
});
document.addEventListener('dragstart', e => {
  if (!e.target.closest('input, textarea, [contenteditable]')) {
    e.preventDefault();
  }
});
