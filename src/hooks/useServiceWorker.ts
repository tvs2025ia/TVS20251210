import { useEffect, useState } from 'react';

export function useServiceWorker() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      setIsSupported(true);
      registerServiceWorker();
    } else {
      console.warn('⚠️ Service Worker no soportado en este navegador');
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      setRegistration(reg);
      setIsRegistered(true);
      
      console.log('✅ Service Worker registrado correctamente');

      // Listen for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              console.log('🔄 Actualización del Service Worker disponible');
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'BACKGROUND_SYNC') {
          console.log('🔄 Background sync solicitado por Service Worker');
          // Trigger sync in the app
          window.dispatchEvent(new CustomEvent('background-sync'));
        }
      });

    } catch (error) {
      console.error('❌ Error registrando Service Worker:', error);
    }
  };

  const updateServiceWorker = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const unregisterServiceWorker = async () => {
    if (registration) {
      const success = await registration.unregister();
      if (success) {
        setIsRegistered(false);
        setRegistration(null);
        console.log('🗑️ Service Worker desregistrado');
      }
    }
  };

  return {
    isSupported,
    isRegistered,
    updateAvailable,
    updateServiceWorker,
    unregisterServiceWorker
  };
}