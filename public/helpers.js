window.showToast = function(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.error('Toast container not found.');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close-btn';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
        hideToast(toast);
    });
    toast.appendChild(closeBtn);

    toastContainer.appendChild(toast);

    const autoRemoveTimeout = setTimeout(() => {
        hideToast(toast);
    }, duration);

    function hideToast(toastElement) {
        toastElement.classList.add('fade-out');
        toastElement.addEventListener('transitionend', () => {
            toastElement.remove();
        }, { once: true });
        clearTimeout(autoRemoveTimeout);
    }
};

window.stripHtml = function(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};
