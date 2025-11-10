import { onAuthChange, getCurrentUser, signInWithGoogle } from '../auth.js?v=1';
import { showPopupMessage } from '../ui.js?v=1';

const accountButton = document.getElementById('accountButton');

function renderDefaultButton() {
  if (!accountButton) return;
  accountButton.classList.add('account-btn--icon');
  accountButton.classList.remove('account-btn--has-avatar');
  accountButton.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
  accountButton.title = 'Compte';
}

function renderAvatar(user) {
  if (!accountButton) return;
  accountButton.classList.remove('account-btn--icon');
  accountButton.classList.add('account-btn--has-avatar');
  accountButton.innerHTML = '';
  const img = document.createElement('img');
  img.src = user.photoURL;
  img.alt = user.displayName || 'Photo de profil';
  img.referrerPolicy = 'no-referrer';
  img.className = 'account-btn__avatar';
  accountButton.appendChild(img);
  accountButton.title = user.displayName || 'Mon compte';
}

function setupAccountButton() {
  if (!accountButton) return;

  accountButton.addEventListener('click', async () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      try {
        await signInWithGoogle();
      } catch (error) {
        console.error('Sign-in failed:', error);
        showPopupMessage('Connexion impossible pour le moment.');
      }
      return;
    }
    window.location.href = './account.html';
  });

  onAuthChange((user) => {
    if (user?.photoURL) {
      renderAvatar(user);
    } else {
      renderDefaultButton();
    }
  });

  const existingUser = getCurrentUser();
  if (existingUser?.photoURL) {
    renderAvatar(existingUser);
  } else {
    renderDefaultButton();
  }
}

setupAccountButton();
