// GhostDrop Client JS

document.addEventListener('DOMContentLoaded', () => {
  // Character counter on create form
  const contentInput = document.getElementById('content');
  const charCount = document.getElementById('char-count');
  if (contentInput && charCount) {
    contentInput.addEventListener('input', () => {
      const len = contentInput.value.length;
      if (len > 1000) {
        charCount.textContent = `${(len / 1000).toFixed(1)}K / ${charCount.textContent.split('/')[1].trim()}`;
      } else {
        charCount.textContent = `${len} / ${charCount.textContent.split('/')[1].trim()}`;
      }
    });
  }

  // Prevent double-submit on create form
  const createForm = document.getElementById('create-form');
  const createBtn = document.getElementById('create-btn');
  if (createForm && createBtn) {
    createForm.addEventListener('submit', () => {
      createBtn.disabled = true;
      createBtn.textContent = 'Encrypting...';
    });
  }

  // Auto-dismiss flash messages
  const flash = document.querySelector('.gd-flash');
  if (flash) {
    setTimeout(() => {
      flash.style.transition = 'opacity 0.3s';
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 300);
    }, 5000);
  }
});
