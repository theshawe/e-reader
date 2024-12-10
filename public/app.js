// app.js

let currentView = 'myfeeds';
let currentFeedUrl = null;
let currentFeedTitle = null;
let currentlyViewingFeed = null;
let isCurrentFeedSaved = false;
let allFeedsData = [];
const articleContentMap = new Map();

// Pagination settings for Explore
let currentExplorePage = 1;
const feedsPerPage = 20;

document.addEventListener('DOMContentLoaded', async () => {
    await loadAllFeedsData();
    setupNav();
    loadSavedFeeds();
    loadUserAvatar();
    setupPreviewModal();
    showOnboardingIfNeeded();
    renderSuggestedFeeds();
});

async function loadAllFeedsData() {
  try {
    const response = await fetch('/feeds.json');
    const data = await response.json();
    allFeedsData = data.feeds;
  } catch (err) {
    console.error('Failed to load feeds:', err);
  }
}

/* Navigation & UI */
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
        if (favItem && !event.target.classList.contains('remove-feed-btn') && !event.target.classList.contains('rename-icon')) {
            const url = favItem.getAttribute('data-url');
            const title = favItem.textContent.replace('✖', '').replace('✎','').trim();
            openFeedDetail(url, title, isFeedSaved(url));
        }
    });

    sidebar.addEventListener('keypress', (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('favorite-feed')) {
            event.preventDefault();
            const url = event.target.getAttribute('data-url');
            const title = event.target.textContent.replace('✖','').replace('✎','').trim();
            openFeedDetail(url, title, isFeedSaved(url));
        }
    });

    const saveFeedBtn = document.getElementById('saveFeedBtn');
    saveFeedBtn.addEventListener('click', () => {
        if (currentFeedUrl && currentlyViewingFeed) {
            saveCurrentViewingFeed();
        }
    });

    const myFeedsHeading = document.getElementById('myFeedsHeading');
    const sidebarEl = document.querySelector('.sidebar');
    myFeedsHeading.addEventListener('click', () => {
      sidebarEl.classList.toggle('collapsed');
    });

    document.getElementById('myFeedsSearch').addEventListener('input', loadSavedFeeds);
    document.getElementById('exploreSearch').addEventListener('input', () => {
        currentExplorePage = 1;
        renderSuggestedFeeds();
    });
    document.getElementById('exploreCategoryFilter').addEventListener('change', () => {
        currentExplorePage = 1;
        renderSuggestedFeeds();
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
        if (currentFeedUrl) {
            feedDetailContainer.classList.remove('hidden');
        } else {
            feedDetailContainer.classList.add('hidden');
        }
    }
}

/* Explore & Suggested Feeds */
function renderSuggestedFeeds() {
    const container = document.getElementById('suggestedFeeds');
    const noFeedsMessage = document.getElementById('noFeedsMessage');
    const paginationContainer = document.getElementById('explorePagination');

    const searchValue = document.getElementById('exploreSearch').value.toLowerCase();
    const categoryValue = document.getElementById('exploreCategoryFilter').value;

    if (!allFeedsData || allFeedsData.length === 0) {
      container.innerHTML = '';
      paginationContainer.innerHTML = '';
      noFeedsMessage.classList.remove('hidden');
      noFeedsMessage.textContent = 'No feeds available.';
      return;
    }

    const filtered = allFeedsData.filter(feed => {
      const titleMatch = feed.title.toLowerCase().includes(searchValue);
      const catMatch = categoryValue === '' || feed.category === categoryValue;
      return titleMatch && catMatch;
    });

    container.innerHTML = '';
    paginationContainer.innerHTML = '';

    if (filtered.length === 0) {
      noFeedsMessage.classList.remove('hidden');
    } else {
      noFeedsMessage.classList.add('hidden');
    }

    // Pagination
    const totalFeeds = filtered.length;
    const totalPages = Math.ceil(totalFeeds / feedsPerPage);
    const startIndex = (currentExplorePage - 1) * feedsPerPage;
    const endIndex = startIndex + feedsPerPage;
    const pageFeeds = filtered.slice(startIndex, endIndex);

    pageFeeds.forEach(feed => {
      const feedItem = document.createElement('div');
      feedItem.className = 'suggested-feed-item';
      feedItem.textContent = feed.title;
      feedItem.addEventListener('click', () => openFeedDetail(feed.url, feed.title, false, true));
      container.appendChild(feedItem);
    });

    if (totalPages > 1) {
      for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.disabled = (i === currentExplorePage);
        pageBtn.addEventListener('click', () => {
          currentExplorePage = i;
          renderSuggestedFeeds();
        });
        paginationContainer.appendChild(pageBtn);
      }
    }
}

/* Managing Feeds */
function getSavedFeeds() {
    return JSON.parse(localStorage.getItem('savedFeeds')) || [];
}

function loadSavedFeeds() {
    const favoritesList = document.getElementById('favoritesList');
    favoritesList.innerHTML = '';
    const searchVal = document.getElementById('myFeedsSearch').value.toLowerCase();
    let savedFeeds = getSavedFeeds();
    if (searchVal) {
      savedFeeds = savedFeeds.filter(f => f.title.toLowerCase().includes(searchVal));
    }

    if (currentlyViewingFeed && !isCurrentFeedSaved && (!searchVal || currentlyViewingFeed.title.toLowerCase().includes(searchVal))) {
        favoritesList.appendChild(createFavoriteFeedItem(currentlyViewingFeed, true));
    }

    savedFeeds.forEach(feed => {
        favoritesList.appendChild(createFavoriteFeedItem(feed, false));
    });

    Array.from(favoritesList.children).forEach(item => {
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);
      item.draggable = true;
    });
}

function createFavoriteFeedItem(feed, currentlyViewing) {
    const favLink = document.createElement('div');
    favLink.className = 'favorite-feed';
    favLink.setAttribute('tabindex', '0');
    favLink.setAttribute('data-url', feed.url);
    favLink.textContent = feed.title;

    if (currentlyViewing) {
      favLink.classList.add('currently-viewing');
    } else {
      if (feed.url === currentFeedUrl && isCurrentFeedSaved) {
        favLink.classList.add('selected');
      }
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-feed-btn';
    removeBtn.textContent = '✖';
    removeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      removeFeed(feed.url);
    });
    favLink.appendChild(removeBtn);

    const renameIcon = document.createElement('span');
    renameIcon.textContent = '✎';
    renameIcon.className = 'rename-icon';
    renameIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      startRenamingFeed(favLink, feed);
    });
    favLink.appendChild(renameIcon);

    return favLink;
}

function addFeed(feedUrl, feedTitle) {
    let savedFeeds = getSavedFeeds();
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

function removeFeed(feedUrl) {
    let savedFeeds = getSavedFeeds();
    savedFeeds = savedFeeds.filter(f => f.url !== feedUrl);
    localStorage.setItem('savedFeeds', JSON.stringify(savedFeeds));
    loadSavedFeeds();
    if (currentFeedUrl === feedUrl) {
        currentFeedUrl = null;
        document.getElementById('feedDetailContainer').classList.add('hidden');
        currentlyViewingFeed = null;
        isCurrentFeedSaved = false;
        updateSaveFeedButton();
    }
}

function startRenamingFeed(feedElement, feed) {
    const originalTitle = feed.title;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalTitle;
    feedElement.innerHTML = '';
    feedElement.appendChild(input);
    input.focus();

    input.addEventListener('blur', () => finishRenamingFeed(feedElement, feed, input.value));
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') finishRenamingFeed(feedElement, feed, input.value);
    });
}

function finishRenamingFeed(feedElement, feed, newTitle) {
    if (!newTitle.trim()) newTitle = feed.title;
    feed.title = newTitle.trim();
    updateFeedInStorage(feed);
    feedElement.innerHTML = newTitle;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-feed-btn';
    removeBtn.textContent = '✖';
    removeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      removeFeed(feed.url);
    });
    feedElement.appendChild(removeBtn);

    const renameIcon = document.createElement('span');
    renameIcon.textContent = '✎';
    renameIcon.className = 'rename-icon';
    renameIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      startRenamingFeed(feedElement, feed);
    });
    feedElement.appendChild(renameIcon);
}

function updateFeedInStorage(updatedFeed) {
    let savedFeeds = getSavedFeeds();
    const idx = savedFeeds.findIndex(f => f.url === updatedFeed.url);
    if (idx > -1) {
      savedFeeds[idx].title = updatedFeed.title;
      localStorage.setItem('savedFeeds', JSON.stringify(savedFeeds));
    } else if (currentlyViewingFeed && currentlyViewingFeed.url === updatedFeed.url) {
      currentlyViewingFeed.title = updatedFeed.title;
    }
    loadSavedFeeds();
}

/* Drag & Drop */
let dragSrcEl = null;

function handleDragStart(e) {
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.getAttribute('data-url'));
}

function handleDragOver(e) {
  if (e.preventDefault) e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDrop(e) {
  if (e.stopPropagation) e.stopPropagation();
  if (dragSrcEl !== this) {
    const draggedUrl = e.dataTransfer.getData('text/plain');
    const originList = getSavedFeeds();
    const draggedFeed = originList.find(f => f.url === draggedUrl);

    const siblings = Array.from(this.parentNode.children).filter(c => c.classList.contains('favorite-feed'));
    const dropIndex = siblings.indexOf(this);

    originList.splice(originList.indexOf(draggedFeed), 1);
    originList.splice(dropIndex - (currentlyViewingFeed && !isCurrentFeedSaved ? 1 : 0), 0, draggedFeed);
    localStorage.setItem('savedFeeds', JSON.stringify(originList));
    loadSavedFeeds();
  }
  return false;
}

function handleDragEnd(e) {
  // optional: visual cleanup
}

function isFeedSaved(feedUrl) {
    const savedFeeds = getSavedFeeds();
    return savedFeeds.some(f => f.url === feedUrl && f.favorite);
}

/* Open & Render Feed Detail */
async function openFeedDetail(feedUrl, feedTitle, feedSaved = false, fromExplore = false) {
    currentFeedUrl = feedUrl;
    currentFeedTitle = feedTitle;
    isCurrentFeedSaved = feedSaved;

    if (fromExplore && !feedSaved) {
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

function renderFeedDetail(items) {
    const feedList = document.getElementById('feedList');
    const feedDetailContainer = document.getElementById('feedDetailContainer');
    feedList.innerHTML = '';
    articleContentMap.clear();

    if (items.length === 0) {
        feedDetailContainer.classList.remove('hidden');
        return;
    }

    feedDetailContainer.classList.remove('hidden');

    items.forEach((item) => {
        const title = item.querySelector('title')?.textContent || 'No Title';
        let link = '#';
        const linkElement = item.querySelector('link');
        if (linkElement) {
            link = linkElement.getAttribute('href') || linkElement.textContent || '#';
        }

        let description = 'No description available.';
        const contentEncoded = item.querySelector('content\\:encoded');
        if (contentEncoded && contentEncoded.textContent.trim()) {
          description = contentEncoded.textContent;
        } else {
          const descEl = item.querySelector('description, summary, content');
          if (descEl) description = descEl.textContent;
        }

        articleContentMap.set(title, description);

        const feedItem = document.createElement('li');
        feedItem.className = 'feed-item';
        feedItem.innerHTML = `
            <h4 tabindex="0" role="button">${title}</h4>
            <p>${window.stripHtml(description).slice(0, 200)}...</p>
            <button class="read-more-btn" aria-label="Read full article">Read More</button>
        `;

        const titleElement = feedItem.querySelector('h4');
        titleElement.addEventListener('click', () => openPreviewModal(title, description, link));
        titleElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPreviewModal(title, description, link);
            }
        });

        const readMoreBtn = feedItem.querySelector('.read-more-btn');
        readMoreBtn.addEventListener('click', () => openPreviewModal(title, description, link));

        feedList.appendChild(feedItem);
    });
}

/* Save Feed Button */
function updateSaveFeedButton() {
    const saveFeedBtn = document.getElementById('saveFeedBtn');
    if (currentlyViewingFeed && !isCurrentFeedSaved) {
        saveFeedBtn.classList.remove('hidden');
    } else {
        saveFeedBtn.classList.add('hidden');
    }
}

function hideSaveFeedButton() {
    document.getElementById('saveFeedBtn').classList.add('hidden');
}

function saveCurrentViewingFeed() {
    if (!currentlyViewingFeed) return;

    let savedFeeds = getSavedFeeds();
    if (!savedFeeds.some(f => f.url === currentlyViewingFeed.url)) {
        savedFeeds.push({
            title: currentlyViewingFeed.title,
            url: currentlyViewingFeed.url,
            favorite: true
        });
        localStorage.setItem('savedFeeds', JSON.stringify(savedFeeds));
        window.showToast('Feed saved!', 'success');
    }

    currentlyViewingFeed = null;
    isCurrentFeedSaved = true;
    hideSaveFeedButton();
    loadSavedFeeds();
}

/* Modal */
function setupPreviewModal() {
    const previewModal = document.getElementById('previewModal');
    const closePreviewModalBtn = document.getElementById('closePreviewModal');
    if (!previewModal || !closePreviewModalBtn) return;

    closePreviewModalBtn.addEventListener('click', closePreviewModal);

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

/* Loading Bar */
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

/* User Avatar */
function loadUserAvatar() {
    const userAvatar = document.getElementById('userAvatar');
    const avatarInput = document.createElement('input');
    avatarInput.type = 'file';
    avatarInput.accept = 'image/*';
    avatarInput.id = 'avatarInput';
    avatarInput.style.display = 'none';
    document.body.appendChild(avatarInput);
    const removeAvatarBtn = document.getElementById('removeAvatarBtn');

    if (!userAvatar || !removeAvatarBtn) return;

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
            reader.onload = (e) => {
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

    userAvatar.onerror = () => {
        userAvatar.src = 'default-avatar.png';
    };

    removeAvatarBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        localStorage.removeItem('userAvatar');
        userAvatar.src = 'default-avatar.png';
        window.showToast('Avatar removed.', 'info');
    });
}

/* Onboarding Tooltip */
function showOnboardingIfNeeded() {
    if (!localStorage.getItem('hasSeenOnboarding')) {
        const tooltip = document.getElementById('onboardingTooltip');
        tooltip.classList.remove('hidden');
        document.getElementById('closeTooltip').addEventListener('click', () => {
          tooltip.classList.add('hidden');
        });
        localStorage.setItem('hasSeenOnboarding', 'true');
    }
}
