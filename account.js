import { showPopupMessage } from './ui.js?v=1';
import { db, onAuthChange, signInWithGoogle, signOutUser, getCurrentUser } from './auth.js?v=1';
import { getLikedIds, setLikedIds } from './likes.js?v=1';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const avatarEl = document.getElementById('accountAvatar');
const greetingEl = document.getElementById('accountGreeting');
const emailEl = document.getElementById('accountEmail');
const logoutButton = document.getElementById('logoutButton');
const refreshLikesButton = document.getElementById('refreshLikesButton');
const likesListEl = document.getElementById('likesList');
const likesEmptyEl = document.getElementById('likesEmpty');
const homeButton = document.getElementById('homeButton');

let quotes = [];
let quotesLoaded = false;
let currentUser = null;
let syncing = false;

function ensureBaseElements() {
  if (!avatarEl || !greetingEl || !emailEl || !logoutButton || !likesListEl || !likesEmptyEl) {
    console.error('Account page layout is missing required elements.');
  }
}

ensureBaseElements();

homeButton?.addEventListener('click', () => {
  window.location.href = './';
});

logoutButton?.addEventListener('click', async () => {
  if (logoutButton.dataset.action === 'login') {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign-in failed:', error);
      showPopupMessage('Connexion impossible pour le moment. Réessayez plus tard.');
    }
    return;
  }

  try {
    await signOutUser();
    showPopupMessage('Déconnexion effectuée.');
    window.location.href = './';
  } catch (error) {
    console.error('Sign-out failed:', error);
    showPopupMessage('Impossible de se déconnecter. Réessayez.');
  }
});

refreshLikesButton?.addEventListener('click', async () => {
  if (!currentUser || syncing) return;
  await syncAndRenderLikes(currentUser, { forceRefresh: true });
});

async function ensureQuotesLoaded() {
  if (quotesLoaded) return;
  try {
    const quotesUrl = new URL('./data/quotes.json', import.meta.url);
    const response = await fetch(quotesUrl);
    const data = await response.json();
    quotes = (data || []).map((quote, index) => ({
      ...quote,
      id: quote.id != null ? String(quote.id) : String(index)
    }));
    quotesLoaded = true;
  } catch (error) {
    console.error('Failed to load quotes.json:', error);
    showPopupMessage('Impossible de charger les citations.');
  }
}

function findQuoteById(id) {
  const target = String(id);
  return quotes.find((quote, index) => {
    if (quote.id != null) return String(quote.id) === target;
    return String(index) === target;
  }) || null;
}

function setLikesLoading(state) {
  if (!likesListEl) return;
  if (state) {
    likesListEl.dataset.loading = 'true';
    likesListEl.innerHTML = '<div class="no-likes">Chargement...</div>';
    if (likesEmptyEl) likesEmptyEl.style.display = 'none';
  } else if (likesListEl.dataset.loading === 'true') {
    likesListEl.innerHTML = '';
    delete likesListEl.dataset.loading;
  }
}

function renderLikes(ids) {
  if (!likesListEl || !likesEmptyEl) return;

  likesListEl.innerHTML = '';

  if (!ids || ids.length === 0) {
    likesEmptyEl.style.display = 'block';
    likesEmptyEl.textContent = 'Aucune citation enregistrée pour le moment.';
    return;
  }

  likesEmptyEl.style.display = 'none';

  ids.forEach(id => {
    const quote = findQuoteById(id);
    if (!quote) return;

    const item = document.createElement('article');
    item.className = 'like-item';
    const authorLabel = quote.author ? `- ${quote.author}` : '';
    item.innerHTML = `
      <p class="like-item__text">${quote.text}</p>
      <div class="like-item__meta">
        <span class="like-item__author">${authorLabel}</span>
        <button class="like-item__delete" type="button" data-quote-id="${quote.id ?? id}">
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
          <span>Retirer</span>
        </button>
      </div>
    `;
    const deleteButton = item.querySelector('.like-item__delete');
    deleteButton?.addEventListener('click', () => handleDeleteLike(quote.id ?? id));
    likesListEl.appendChild(item);
  });
}

async function handleDeleteLike(rawId) {
  if (!currentUser) {
    showPopupMessage('Connectez-vous pour gérer vos favoris.');
    return;
  }
  const targetId = String(rawId);
  const existing = getLikedIds().map(String);
  if (!existing.includes(targetId)) return;

  if (syncing) return;
  syncing = true;

  const updated = existing.filter(id => id !== targetId);
  setLikedIds(updated);

  if (!quotesLoaded) {
    await ensureQuotesLoaded();
  }
  renderLikes(updated);

  try {
    const userRef = doc(db, 'userLikes', currentUser.uid);
    await setDoc(userRef, { likes: updated }, { merge: true });
    showPopupMessage('Citation retirée de vos likes.');
  } catch (error) {
    console.error('Failed to remove like from Firestore:', error);
    showPopupMessage('Suppression impossible pour le moment.');
  } finally {
    syncing = false;
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

function arraysDiffer(a, b) {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return true;
  }
  return false;
}

async function syncAndRenderLikes(user, { forceRefresh = false } = {}) {
  if (!user) return;
  syncing = true;
  setLikesLoading(true);
  try {
    const [remoteLikes, localLikes] = await Promise.all([
      loadUserLikes(user.uid),
      Promise.resolve(getLikedIds().map(value => String(value)))
    ]);

    const mergedSet = new Set([...remoteLikes.map(String), ...localLikes]);
    const merged = Array.from(mergedSet);

    setLikedIds(merged);

    const remoteSorted = [...remoteLikes].map(String).sort();
    const mergedSorted = [...merged].map(String).sort();
    if (forceRefresh || arraysDiffer(remoteSorted, mergedSorted)) {
      const userRef = doc(db, 'userLikes', user.uid);
      await setDoc(userRef, { likes: mergedSorted }, { merge: true });
    }

    await ensureQuotesLoaded();
    setLikesLoading(false);
    renderLikes(merged);
  } catch (error) {
    console.error('Failed to sync likes on account page:', error);
    showPopupMessage('Erreur lors de la récupération des likes.');
    setLikesLoading(false);
  } finally {
    syncing = false;
  }
}

function applySignedOutState() {
  currentUser = null;
  if (avatarEl) {
    avatarEl.src = './image/logo.png';
    avatarEl.alt = 'Logo Catho Wiki';
    avatarEl.removeAttribute('referrerpolicy');
  }
  if (greetingEl) greetingEl.textContent = 'Bonjour !';
  if (emailEl) emailEl.textContent = 'Connectez-vous pour retrouver vos citations favorites.';
  if (logoutButton) {
    logoutButton.textContent = 'Se connecter';
    logoutButton.dataset.action = 'login';
  }
  if (refreshLikesButton) {
    refreshLikesButton.style.display = 'none';
  }
  if (likesListEl) likesListEl.innerHTML = '';
  if (likesEmptyEl) {
    likesEmptyEl.style.display = 'block';
    likesEmptyEl.textContent = 'Aucune citation : connectez-vous pour voir vos favoris.';
  }
  if (likesListEl?.dataset) {
    delete likesListEl.dataset.loading;
  }
}

function applySignedInState(user) {
  currentUser = user;
  const firstName = user.displayName ? user.displayName.split(' ')[0] : 'toi';
  if (avatarEl) {
    avatarEl.src = user.photoURL || './image/logo.png';
    avatarEl.referrerPolicy = user.photoURL ? 'no-referrer' : '';
    avatarEl.alt = `Photo de ${user.displayName || firstName}`;
  }
  if (greetingEl) greetingEl.textContent = `Bonjour, ${firstName} !`;
  if (emailEl) emailEl.textContent = user.email || '';
  if (logoutButton) {
    logoutButton.textContent = 'Se déconnecter';
    logoutButton.dataset.action = 'logout';
  }
  if (refreshLikesButton) {
    refreshLikesButton.style.display = 'inline-flex';
  }
}

onAuthChange(async user => {
  if (!user) {
    applySignedOutState();
    return;
  }

  applySignedInState(user);
  await syncAndRenderLikes(user);
});

// If user already authenticated before listener attaches
const existingUser = getCurrentUser();
if (existingUser) {
  applySignedInState(existingUser);
  syncAndRenderLikes(existingUser);
} else {
  applySignedOutState();
}
