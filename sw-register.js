if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered.', reg);
      if (reg.installing) console.log('SW installing');
      if (reg.waiting) console.log('SW waiting');
      if (reg.active) console.log('SW active');
      reg.addEventListener('updatefound', () => console.log('SW updatefound'));
    } catch (err) {
      console.warn('Service worker registration failed:', err);
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service worker controller changed');
    });
  });
}
