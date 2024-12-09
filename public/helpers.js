// helpers.js

/**
 * Displays a toast notification with the given message and type.
 * @param {string} message - The message to display.
 * @param {string} [type='info'] - The type of toast ('info', 'success', 'error', etc.).
 * @param {number} [duration=3000] - Duration in milliseconds before the toast disappears.
 */
function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.error('Toast container not found in the DOM.');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    // Create toast content
    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);

    // Optional: Add a close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close-btn';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    toast.appendChild(closeBtn);

    // Event listener for close button
    closeBtn.addEventListener('click', () => {
        hideToast(toast);
    });

    // Append the toast to the container
    toastContainer.appendChild(toast);

    // Automatically remove the toast after the specified duration
    const autoRemoveTimeout = setTimeout(() => {
        hideToast(toast);
    }, duration);

    // Function to hide and remove the toast
    function hideToast(toastElement) {
        toastElement.classList.add('fade-out');
        // Remove existing click listener to prevent multiple triggers
        toastElement.removeEventListener('click', hideToast);
        // Remove the toast after the fade-out transition ends
        toastElement.addEventListener('transitionend', () => {
            toastElement.remove();
        }, { once: true });
        clearTimeout(autoRemoveTimeout);
    }
}

/**
 * Strips HTML tags from a given string.
 * @param {string} html - The HTML string to strip.
 * @returns {string} - The plain text string.
 */
function stripHtml(html) {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

// Expose functions globally
window.showToast = showToast;
window.stripHtml = stripHtml;
