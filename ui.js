// ui.js — fonctions d'affichage d'UI (popups)
export function showPopupMessage(text, options = {}) {
  // options: { durationMs, buttons: [{text, className, onClick}] }
  const popupRoot = document.getElementById('popup-root');
  if (!popupRoot) return;

  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.innerHTML = `
    <div class="popup-card" role="dialog" aria-modal="true">
      <p class="popup-text">${text}</p>
      <div class="popup-actions"></div>
    </div>
  `;

  const actions = overlay.querySelector('.popup-actions');

  // buttons
  const buttons = options.buttons || [];
  if (buttons.length === 0) {
    // default OK
    const ok = document.createElement('button');
    ok.className = 'btn-primary';
    ok.textContent = 'OK';
    ok.addEventListener('click', () => close());
    actions.appendChild(ok);
  } else {
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = b.className || 'btn-ghost';
      btn.textContent = b.text || 'OK';
      btn.addEventListener('click', () => {
        if (typeof b.onClick === 'function') b.onClick();
        close();
      });
      actions.appendChild(btn);
    });
  }

  function close() {
    try { popupRoot.removeChild(overlay); } catch(e){}
  }

  popupRoot.appendChild(overlay);

  // auto close
  const duration = options.durationMs ?? 1500;
  if (duration > 0 && buttons.length === 0) {
    setTimeout(close, duration);
  }

  return {
    close
  };
}
