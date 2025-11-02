import { showPopupMessage } from './ui.js?v=1';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { db, onAuthChange, signInWithGoogle, getCurrentUser } from './auth.js?v=1';
import { getLikedIds, isLiked, addLikeLocal, removeLikeLocal, setLikedIds } from './likes.js?v=1';

const container = document.getElementById('quote-container');
const quoteText = document.getElementById('quote-text');
const quoteAuthor = document.getElementById('quote-author');
const likeBtn = document.getElementById('like-btn');
const shareBtn = document.getElementById('share-btn');
const accountButton = document.getElementById('accountButton');

const MAX_HISTORY = 5;
const SWIPE_THRESHOLD = 80;
const FADE_DURATION_MS = 250;

let quotes = [];
let history = [];
let historyPointer = -1;

let touchStartY = null;
let lastTapTime = 0;
let isFading = false;
const actionQueue = [];

console.info('[HazeApp] UI script initialised', { host: window.location.host });

if (!container || !quoteText || !quoteAuthor || !likeBtn || !shareBtn || !accountButton) {
  console.error('Missing required DOM nodes.');
}

if (container) {
  container.style.opacity = '1';
}

function getQuoteId(index) {
  const quote = quotes[index];
  if (!quote) return null;
  return quote.id != null ? String(quote.id) : String(index);
}

function getCurrentQuoteId() {
  const historyIndex = history[historyPointer];
  if (typeof historyIndex === 'undefined') return null;
  return getQuoteId(historyIndex);
}

function findQuoteById(id) {
  const target = String(id);
  return quotes.find((quote, index) => getQuoteId(index) === target);
}

function applyQuoteToDom(quote) {
  if (!quote || !quoteText || !quoteAuthor) return;
  quoteText.textContent = quote.text || '';
  quoteAuthor.textContent = quote.author ? `- ${quote.author}` : '';
}

function applyQuoteAndRefresh(index) {
  const quote = quotes[index];
  if (!quote) return;
  applyQuoteToDom(quote);
  updateLikeVisual();
}

function queueAction(action) {
  actionQueue.push(action);
}

function consumePendingAction() {
  if (actionQueue.length === 0) return;
  const next = actionQueue.shift();
  if (next === 'next') {
    showNextQuote();
  } else if (next === 'prev') {
    showPreviousQuote();
  }
}

function pickNextQuoteIndex() {
  if (quotes.length === 0) return null;
  if (quotes.length === 1) return 0;

  const used = new Set(history);
  let candidate = Math.floor(Math.random() * quotes.length);
  let attempts = 0;

  while (used.has(candidate) && attempts < quotes.length * 2) {
    candidate = Math.floor(Math.random() * quotes.length);
    attempts += 1;
  }

  if (used.has(candidate) && history.length) {
    return (history[history.length - 1] + 1) % quotes.length;
  }

  return candidate;
}

function pushToHistory(index) {
  history.push(index);
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
  historyPointer = history.length - 1;
}

function gotoNextIndex() {
  if (!quotes.length) return null;

  if (historyPointer < history.length - 1) {
    historyPointer += 1;
    return history[historyPointer];
  }

  const nextIndex = pickNextQuoteIndex();
  if (nextIndex == null) return null;
  pushToHistory(nextIndex);
  return history[historyPointer];
}

function gotoPreviousIndex() {
  if (historyPointer > 0) {
    historyPointer -= 1;
    return history[historyPointer];
  }
  return null;
}

function showNextQuote(options = {}) {
  if (!options.instant && isFading) {
    queueAction('next');
    return;
  }
  const nextIndex = gotoNextIndex();
  if (nextIndex == null) return;

  if (options.instant) {
    applyQuoteAndRefresh(nextIndex);
    return;
  }

  fadeToQuote(nextIndex);
}

function showPreviousQuote(options = {}) {
  if (!options.instant && isFading) {
    queueAction('prev');
    return;
  }
  const previousIndex = gotoPreviousIndex();
  if (previousIndex == null) return;

  if (options.instant) {
    applyQuoteAndRefresh(previousIndex);
    return;
  }

  fadeToQuote(previousIndex);
}

function updateLikeVisual() {
  if (!likeBtn) return;
  const likeIcon = likeBtn.querySelector('i');
  const currentId = getCurrentQuoteId();
  if (!likeIcon || !currentId) return;

  if (isLiked(currentId)) {
    likeIcon.className = 'fa-solid fa-heart fa-beat';
    likeBtn.classList.add('liked');
  } else {
    likeIcon.className = 'fa-regular fa-heart fa-beat';
    likeBtn.classList.remove('liked');
  }
}

function fadeToQuote(targetIndex) {
  const quote = quotes[targetIndex];
  if (!quote) return;

  if (!container) {
    applyQuoteAndRefresh(targetIndex);
    return;
  }

  isFading = true;

  let fallbackTimeout;

  const cleanup = () => {
    if (fallbackTimeout) {
      clearTimeout(fallbackTimeout);
      fallbackTimeout = null;
    }
    container.removeEventListener('transitionend', handleFadeOut);
    container.removeEventListener('transitionend', handleFadeIn);
    container.style.transition = '';
    isFading = false;
    consumePendingAction();
  };

  const handleFadeIn = event => {
    if (event.propertyName !== 'opacity') return;
    cleanup();
  };

  const startFadeIn = () => {
    applyQuoteAndRefresh(targetIndex);
    container.addEventListener('transitionend', handleFadeIn, { once: true });
    requestAnimationFrame(() => {
      container.style.transition = '';
      void container.offsetWidth;
      container.style.transition = `opacity ${FADE_DURATION_MS}ms ease`;
      container.style.opacity = '1';
    });
  };

  const handleFadeOut = event => {
    if (event.propertyName !== 'opacity') return;
    container.removeEventListener('transitionend', handleFadeOut);
    startFadeIn();
  };

  container.addEventListener('transitionend', handleFadeOut, { once: true });

  requestAnimationFrame(() => {
    container.style.transition = '';
    container.style.opacity = '1';
    void container.offsetWidth;
    container.style.transition = `opacity ${FADE_DURATION_MS}ms ease`;
    container.style.opacity = '0';
  });

  fallbackTimeout = setTimeout(() => {
    applyQuoteAndRefresh(targetIndex);
    container.style.transition = '';
    container.style.opacity = '1';
    cleanup();
  }, FADE_DURATION_MS * 3);
}

async function addLikeServer(userUid, quoteId) {
  const userRef = doc(db, 'userLikes', userUid);
  await setDoc(userRef, { likes: arrayUnion(String(quoteId)) }, { merge: true });
}

async function removeLikeServer(userUid, quoteId) {
  const userRef = doc(db, 'userLikes', userUid);
  try {
    await updateDoc(userRef, { likes: arrayRemove(String(quoteId)) });
  } catch (error) {
    if (error?.code === 'not-found') {
      await setDoc(userRef, { likes: [] }, { merge: true });
      return;
    }
    throw error;
  }
}

async function loadUserLikes(userUid) {
  const userRef = doc(db, 'userLikes', userUid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) return [];

  const data = snapshot.data();
  if (!Array.isArray(data.likes)) return [];
  return data.likes.map(value => String(value));
}

async function syncLikesForUser(user) {
  try {
    const remoteLikes = await loadUserLikes(user.uid);
    const localLikes = getLikedIds().map(value => String(value));
    const merged = Array.from(new Set([...remoteLikes.map(String), ...localLikes]));

    setLikedIds(merged);
    updateLikeVisual();

    const remoteSorted = [...remoteLikes].sort();
    const mergedSorted = [...merged].sort();
    const differs = remoteSorted.length !== mergedSorted.length ||
      remoteSorted.some((value, index) => value !== mergedSorted[index]);

    if (differs) {
      const userRef = doc(db, 'userLikes', user.uid);
      await setDoc(userRef, { likes: merged }, { merge: true });
    }
  } catch (error) {
    console.error('Failed to sync likes with Firestore:', error);
    showPopupMessage('Cloud sync is unavailable right now.');
  }
}

async function toggleLike({ forceLike = null, promptGuest = false } = {}) {
  const quoteId = getCurrentQuoteId();
  if (!quoteId) return;

  const user = getCurrentUser();
  const alreadyLiked = isLiked(quoteId);
  const targetState = forceLike === null ? !alreadyLiked : forceLike;
  if (targetState === alreadyLiked) return;

  if (targetState) {
    addLikeLocal(quoteId);
  } else {
    removeLikeLocal(quoteId);
  }

  updateLikeVisual();

  if (!user) {
    if (promptGuest) {
      showPopupMessage('Sign in to sync your favorites in the cloud.', {
        buttons: [
          { text: 'Sign in', className: 'btn-primary', onClick: () => signInWithGoogle() },
          { text: 'Later', className: 'btn-ghost' }
        ]
      });
    }
    return;
  }

  try {
    if (targetState) {
      await addLikeServer(user.uid, quoteId);
    } else {
      await removeLikeServer(user.uid, quoteId);
    }
  } catch (error) {
    console.error('Failed to sync like with Firestore:', error);
    showPopupMessage('Could not sync with the server. Please try again later.');
  }
}

accountButton?.addEventListener('click', async () => {
  const user = getCurrentUser();
  if (!user) {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign-in failed:', error);
      showPopupMessage('Sign-in failed. Please try again.');
    }
    return;
  }
  window.location.href = './account.html';
});

likeBtn?.addEventListener('click', () => {
  toggleLike({ promptGuest: true });
});

shareBtn?.addEventListener('click', () => {
  if (!quoteText || !quoteAuthor) return;
  const text = `${quoteText.textContent || ''}\n${quoteAuthor.textContent || ''}`.trim();
  if (!text) return;

  if (navigator.share) {
    navigator.share({ title: 'Quote', text }).catch(() => {});
  } else {
    showPopupMessage('Copy this quote to share it:', {
      buttons: [
        {
          text: 'Copy',
          className: 'btn-primary',
          onClick: () => navigator.clipboard?.writeText(text).catch(() => {})
        },
        { text: 'Close', className: 'btn-ghost' }
      ]
    });
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === ' ') {
    event.preventDefault();
    if (isFading) {
      queueAction('next');
    } else {
      showNextQuote();
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (isFading) {
      queueAction('prev');
    } else {
      showPreviousQuote();
    }
  }
});

function handleTouchStart(event) {
  const touch = event.touches?.[0];
  if (!touch) return;

  touchStartY = touch.clientY;
}

function handleTouchEnd(event) {
  const now = Date.now();
  const touch = event.changedTouches?.[0];
  const endY = touch?.clientY ?? 0;
  const startY = touchStartY ?? endY;
  touchStartY = null;
  if (!touch) {
    lastTapTime = now;
    return;
  }

  const delta = startY - endY;

  if (Math.abs(delta) > SWIPE_THRESHOLD) {
    if (delta > 0) {
      if (isFading) {
        queueAction('next');
      } else {
        showNextQuote();
      }
    } else {
      if (isFading) {
        queueAction('prev');
      } else {
        showPreviousQuote();
      }
    }
    lastTapTime = now;
    return;
  }

  const timeSinceLastTap = now - lastTapTime;
  if (timeSinceLastTap > 0 && timeSinceLastTap < 300) {
    const quoteId = getCurrentQuoteId();
    if (quoteId) {
      const alreadyLiked = isLiked(quoteId);
      toggleLike({ forceLike: true });
      if (!alreadyLiked) {
        showPopupMessage('<3 Saved to favorites!', { durationMs: 900 });
      }
    }
    lastTapTime = 0;
    return;
  }

  lastTapTime = now;
}

document.addEventListener('touchstart', handleTouchStart, { passive: true });
document.addEventListener('touchend', handleTouchEnd);
document.addEventListener('touchcancel', handleTouchEnd);

onAuthChange(async user => {
  if (user) {
    if (accountButton) {
      accountButton.classList.remove('account-btn--icon', 'account-btn--has-avatar');
      accountButton.innerHTML = '';
      if (user.photoURL) {
        accountButton.classList.add('account-btn--has-avatar');
        const img = document.createElement('img');
        img.src = user.photoURL;
        img.referrerPolicy = 'no-referrer';
        img.alt = user.displayName || 'Photo de profil';
        img.className = 'account-btn__avatar';
        accountButton.appendChild(img);
      } else {
        accountButton.classList.add('account-btn--icon');
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-user';
        accountButton.appendChild(icon);
      }
      accountButton.title = user.displayName || 'Mon compte';
    }
    try {
      await syncLikesForUser(user);
    } catch {
      // sync function already logs and shows messages
    }
  } else {
    if (accountButton) {
      accountButton.classList.add('account-btn--icon');
      accountButton.classList.remove('account-btn--has-avatar');
      accountButton.innerHTML = '';
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-user';
      accountButton.appendChild(icon);
      accountButton.title = 'Se connecter';
    }
    updateLikeVisual();
  }
});

async function loadQuotes() {
  try {
    const quotesUrl = new URL('./data/quotes.json', import.meta.url);
    const response = await fetch(quotesUrl);
    const data = await response.json();
    quotes = (data || []).map((quote, index) => ({
      ...quote,
      id: quote.id != null ? String(quote.id) : String(index)
    }));
    showNextQuote({ instant: true });
  } catch (error) {
    console.error('Failed to load quotes.json:', error);
    showPopupMessage('Unable to load quotes.');
  }
}

loadQuotes();
