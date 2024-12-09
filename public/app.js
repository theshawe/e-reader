// app.js

document.addEventListener('DOMContentLoaded', () => {
    setupNav();
    loadSavedFeeds(); // Load saved feeds on start
    renderSuggestedFeeds(); // Populate Explore tab
    loadUserAvatar(); // Load avatar on page load
    setupPreviewModal(); // Initialize preview modal
});

/* =========================================
   Global Variables
========================================= */
let currentView = 'myfeeds';
let currentFeedUrl = null;
let currentFeedTitle = null;
let currentlyViewingFeed = null; // For a feed selected from Explore but not saved
let isCurrentFeedSaved = false; // Track if current feed is saved (so we show/hide save button)

// Suggested feeds array
const suggestedFeeds = [
    { title: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
    { title: 'BBC Sport', url: 'http://feeds.bbci.co.uk/sport/rss.xml' },
    { title: 'David Shawe - Blog', url: 'https://davidshawe.com/feed.xml' },
    { title: 'BBC News - World', url: 'http://feeds.bbci.co.uk/news/world/rss.xml' }
];

// Store full article data in memory for modal preview
// Key: article title, Value: full description
const articleContentMap = new Map();

/* =========================================
   Navigation & Interaction
========================================= */
function setupNav() {
    const fetchBtn = document.getElementById('fetchBtn');
    fetchBtn.addEventListener('click', () => {
        const feedUrlInput = document.getElementById('rssUrl');
        const feedUrl = feedUrlInput.value.trim();
        if (feedUrl) {
            addFeed(feedUrl, 'Custom Feed');
            feedUrlInput.value = '';
        } else {
            window.showToast('Please enter a valid RSS feed URL.', 'error');
        }
    });

    const feedUrlInput = document.getElementById('rssUrl');
    feedUrlInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            fetchBtn.click();
        }
    });

    const sidebar = document.querySelector('.sidebar');
    sidebar.addEventListener('click', (event) => {
        const item = event.target.closest('.nav-item');
        if (item && item.dataset.view) {
            switchView(item.dataset.view);
        }

        const favItem = event.target.closest('.favorite-feed');
        if (favItem) {
            const url = favItem.getAttribute('data-url');
            const title = favItem.textContent.trim();
            // This feed is from favorites or currently viewing
            openFeedDetail(url, title, isFeedSaved(url));
        }
    });

    sidebar.addEventListener('keypress', (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('favorite-feed')) {
            event.preventDefault();
            const url = event.target.getAttribute('data-url');
            const title = event.target.textContent.trim();
            openFeedDetail(url, title, isFeedSaved(url));
        }
    });

    const saveFeedBtn = document.getElementById('saveFeedBtn');
    saveFeedBtn.addEventListener('click', () => {
        if (currentFeedUrl && currentlyViewingFeed) {
            // Save the currently viewing feed
            saveCurrentViewingFeed();
        }
    });
}

function switchView(view) {
    currentView = view;
    const exploreContainer = document.getElementById('exploreContainer');
    const feedDetailContainer = document.getElementById('feedDetailContainer');

    if (view === 'explore') {
        exploreContainer.classList.remove('hidden');
        feedDetailContainer.classList.add('hidden');
        hideSaveFeedButton();
    } else {
        exploreContainer.classList.add('hidden');
        // If a feed is selected show it, else show nothing
        if (currentFeedUrl) {
            feedDetailContainer.classList.remove('hidden');
        } else {
            feedDetailContainer.classList.add('hidden');
        }
    }
}

/* =========================================
   Explore & Suggested Feeds
========================================= */
function renderSuggestedFeeds() {
    const container = document.getElementById('suggestedFeeds');
    container.innerHTML = '';

    suggestedFeeds.forEach((feed) => {
        const feedButton = document.createElement('div');
        feedButton.className = 'suggested-feed-item';
        feedButton.textContent = feed.title;
        feedButton.setAttribute('aria-label', `Add feed: ${feed.title}`);

        feedButton.addEventListener('click', () => {
            openFeedDetail(feed.url, feed.title, false, true);
        });

        feedButton.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                feedButton.click();
            }
        });

        container.appendChild(feedButton);
    });
}

/* =========================================
   Add a New Feed (Saved)
========================================= */
function addFeed(feedUrl, feedTitle) {
    const savedFeeds = getSavedFeeds();
    if (savedFeeds.some(feed => feed.url === feedUrl)) {
        window.showToast('Feed already exists.', 'info');
        return;
    }

    savedFeeds.push({
        title: feedTitle,
        url: feedUrl,
        favorite: true
    });

    localStorage.setItem('savedFeeds', JSON.stringify(savedFeeds));
    window.showToast('Feed added successfully!', 'success');
    loadSavedFeeds();
}

/* =========================================
   Saved Feeds Management
========================================= */
function getSavedFeeds() {
    return JSON.parse(localStorage.getItem('savedFeeds')) || [];
}

function loadSavedFeeds() {
    const savedFeeds = getSavedFeeds();
    const favoritesList = document.getElementById('favoritesList');
    favoritesList.innerHTML = '';

    // If currently viewing feed from explore not saved yet
    if (currentlyViewingFeed) {
        const cvItem = document.createElement('div');
        cvItem.className = 'favorite-feed favorite-feed currently-viewing';
        cvItem.setAttribute('tabindex', '0');
        cvItem.setAttribute('data-url', currentlyViewingFeed.url);
        cvItem.textContent = currentlyViewingFeed.title;
        favoritesList.appendChild(cvItem);
    }

    savedFeeds.forEach((feed) => {
        const favLink = document.createElement('div');
        favLink.className = 'favorite-feed';
        favLink.setAttribute('tabindex', '0');
        favLink.setAttribute('data-url', feed.url);
        favLink.textContent = feed.title;

        // If this feed is currently selected, highlight it
        if (feed.url === currentFeedUrl && isCurrentFeedSaved) {
            favLink.classList.add('selected');
        }

        favoritesList.appendChild(favLink);
    });
}

function isFeedSaved(feedUrl) {
    const savedFeeds = getSavedFeeds();
    return savedFeeds.some(f => f.url === feedUrl && f.favorite);
}

function saveCurrentViewingFeed() {
    if (!currentlyViewingFeed) return;

    const savedFeeds = getSavedFeeds();
    // If not already saved
    if (!savedFeeds.some(f => f.url === currentlyViewingFeed.url)) {
        savedFeeds.push({
            title: currentlyViewingFeed.title,
            url: currentlyViewingFeed.url,
            favorite: true
        });
        localStorage.setItem('savedFeeds', JSON.stringify(savedFeeds));
        window.showToast('Feed saved!', 'success');
    }
    // Clear currently viewing since now it's saved
    currentlyViewingFeed = null;
    isCurrentFeedSaved = true;
    hideSaveFeedButton();
    loadSavedFeeds();
}

/* =========================================
   Open a Feed Detail (from Favorites or Explore)
========================================= */
async function openFeedDetail(feedUrl, feedTitle, feedSaved = false, fromExplore = false) {
    currentFeedUrl = feedUrl;
    currentFeedTitle = feedTitle;
    isCurrentFeedSaved = feedSaved;

    if (fromExplore && !feedSaved) {
        // Set as currently viewing feed
        currentlyViewingFeed = { title: feedTitle, url: feedUrl };
    } else {
        currentlyViewingFeed = null;
    }

    loadSavedFeeds();
    showLoadingBar();

    try {
        const response = await fetch(`/fetchFeed?url=${encodeURIComponent(feedUrl)}`);
        if (!response.ok) throw new Error(`Failed to fetch feed. Status: ${response.status}`);

        const feedXml = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(feedXml, 'application/xml');

        if (xmlDoc.querySelector('parsererror')) {
            window.showToast('Invalid RSS feed format.', 'error');
            return;
        }

        const items = Array.from(xmlDoc.querySelectorAll('item, entry'));
        renderFeedDetail(items);
    } catch (error) {
        console.error('Error fetching feed:', error);
        window.showToast('Failed to fetch feed.', 'error');
    } finally {
        hideLoadingBar();
        switchView('myfeeds');
        updateSaveFeedButton();
    }
}

/* =========================================
   Render Feed Detail
========================================= */
function renderFeedDetail(items) {
    const feedList = document.getElementById('feedList');
    const feedDetailContainer = document.getElementById('feedDetailContainer');
    feedList.innerHTML = '';
    articleContentMap.clear();

    if (items.length === 0) {
        feedDetailContainer.classList.remove('hidden');
        return;
    }

    // Show feed detail container
    feedDetailContainer.classList.remove('hidden');

    items.forEach((item) => {
        const title = item.querySelector('title')?.textContent || 'No Title';
        let link = '#';
        const linkElement = item.querySelector('link');
        if (linkElement) {
            link = linkElement.getAttribute('href') || linkElement.textContent || '#';
        }
        const description = item.querySelector('description, summary, content')?.textContent || 'No description available.';

        // Store full description for modal
        articleContentMap.set(title, description);

        const feedItem = document.createElement('li');
        feedItem.className = 'feed-item';
        feedItem.innerHTML = `
            <h4 tabindex="0" role="button" aria-label="Preview article: ${title}">${title}</h4>
            <p>${window.stripHtml(description).slice(0, 200)}...</p>
            <button class="read-more-btn" aria-label="Read full article">Read More</button>
        `;

        const titleElement = feedItem.querySelector('h4');
        titleElement.addEventListener('click', () => openPreviewModal(title, description, link));
        titleElement.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                titleElement.click();
            }
        });

        const readMoreBtn = feedItem.querySelector('.read-more-btn');
        readMoreBtn.addEventListener('click', () => openPreviewModal(title, description, link));

        feedList.appendChild(feedItem);
    });
}

/* =========================================
   User Avatar Management
========================================= */
function loadUserAvatar() {
    const userAvatar = document.getElementById('userAvatar');
    const avatarInput = document.createElement('input');
    avatarInput.type = 'file';
    avatarInput.accept = 'image/*';
    avatarInput.id = 'avatarInput';
    avatarInput.style.display = 'none';
    document.body.appendChild(avatarInput);
    const removeAvatarBtn = document.getElementById('removeAvatarBtn');

    if (!userAvatar || !removeAvatarBtn) {
        return;
    }

    userAvatar.addEventListener('click', () => {
        avatarInput.click();
    });

    userAvatar.parentElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            avatarInput.click();
        }
    });

    avatarInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const avatarDataUrl = e.target.result;
                userAvatar.src = avatarDataUrl;
                localStorage.setItem('userAvatar', avatarDataUrl);
                window.showToast('Avatar updated successfully!', 'success');
            };
            reader.readAsDataURL(file);
        } else {
            window.showToast('Please upload a valid image file.', 'error');
        }
    });

    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
        userAvatar.src = savedAvatar;
    } else {
        userAvatar.src = 'default-avatar.png';
    }

    userAvatar.onerror = function() {
        userAvatar.src = 'default-avatar.png';
    };

    removeAvatarBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        localStorage.removeItem('userAvatar');
        userAvatar.src = 'default-avatar.png';
        window.showToast('Avatar removed.', 'info');
    });
}

/* =========================================
   Preview Modal (Full Article)
========================================= */
function setupPreviewModal() {
    const previewModal = document.getElementById('previewModal');
    const closePreviewModalBtn = document.getElementById('closePreviewModal');

    if (!previewModal || !closePreviewModalBtn) {
        return;
    }

    closePreviewModalBtn.addEventListener('click', () => {
        closePreviewModal();
    });

    previewModal.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            closePreviewModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !previewModal.classList.contains('hidden')) {
            closePreviewModal();
        }
    });
}

function openPreviewModal(title, description, link) {
    const previewModal = document.getElementById('previewModal');
    const previewTitle = document.getElementById('previewTitle');
    const previewDescription = document.getElementById('previewDescription');
    const previewLink = document.getElementById('previewLink');

    // Use full content from map
    const fullDescription = articleContentMap.get(title) || description;

    previewTitle.textContent = title;
    previewDescription.textContent = window.stripHtml(fullDescription);
    previewLink.href = link || '#';

    previewModal.classList.remove('hidden');
    previewModal.classList.add('visible');
    previewModal.setAttribute('aria-hidden', 'false');
}

function closePreviewModal() {
    const previewModal = document.getElementById('previewModal');
    previewModal.classList.remove('visible');
    previewModal.classList.add('hidden');
    previewModal.setAttribute('aria-hidden', 'true');
}

/* =========================================
   Loading Bar
========================================= */
let loadingInterval = null;

function showLoadingBar() {
    const loadingBar = document.getElementById('loadingBar');
    loadingBar.classList.remove('hidden');
    loadingBar.style.width = '0%';

    let width = 0;
    loadingInterval = setInterval(() => {
        width += 10;
        if (width > 100) width = 100;
        loadingBar.style.width = width + '%';
        if (width >= 100) {
            clearInterval(loadingInterval);
        }
    }, 150);
}

function hideLoadingBar() {
    const loadingBar = document.getElementById('loadingBar');
    clearInterval(loadingInterval);
    loadingBar.classList.add('hidden');
    loadingBar.style.width = '0%';
}

/* =========================================
   Save Feed Button Management
========================================= */
function updateSaveFeedButton() {
    const saveFeedBtn = document.getElementById('saveFeedBtn');
    // Show if we have a currently viewing feed (from explore) not saved
    if (currentlyViewingFeed && !isCurrentFeedSaved) {
        saveFeedBtn.classList.remove('hidden');
    } else {
        saveFeedBtn.classList.add('hidden');
    }
}

function hideSaveFeedButton() {
    const saveFeedBtn = document.getElementById('saveFeedBtn');
    saveFeedBtn.classList.add('hidden');
}

/* =========================================
   Helpers
========================================= */
// stripHtml and showToast are defined in helpers.js
