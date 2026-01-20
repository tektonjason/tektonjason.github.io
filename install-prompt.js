// Adds a temporary install button when the beforeinstallprompt event fires
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('beforeinstallprompt fired');

  if (!document.getElementById('pwa-install-btn')) {
    const btn = document.createElement('button');
    btn.id = 'pwa-install-btn';
    btn.textContent = '安装应用';
    btn.style.position = 'fixed';
    btn.style.bottom = '16px';
    btn.style.left = '16px';
    btn.style.zIndex = 10000;
    btn.className = 'bauhaus-btn bauhaus-btn-primary';
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      console.log('userChoice', choice);
      deferredPrompt = null;
      btn.remove();
    });
    document.body.appendChild(btn);
  }
});

window.addEventListener('appinstalled', () => {
  console.log('PWA installed');
  const b = document.getElementById('pwa-install-btn');
  if (b) b.remove();
});
