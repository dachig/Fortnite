const toggleTextarea = (i) => {
  const textarea = document.getElementById(`blacklistReason${i}`);
  const submitButton = document.getElementById(`submitButton${i}`);
  if (textarea.style.display === 'none') {
    textarea.style.display = 'block';
    submitButton.style.display = 'block';
  } else {
    textarea.style.display = 'none';
    submitButton.style.display = 'none';
  }
};