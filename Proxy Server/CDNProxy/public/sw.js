
// Service Worker para limpeza automática de cache
const CACHE_NAME = 'proxycdn-v' + Date.now();
const OLD_CACHES = [];

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalado - limpando caches antigos');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker ativado - removendo caches antigos');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Interceptar requisições de chunks e forçar reload
  if (event.request.url.includes('/_next/static/chunks/')) {
    console.log('🔄 Interceptando chunk:', event.request.url);
    
    event.respondWith(
      fetch(event.request.url + '?_nocache=' + Date.now(), {
        cache: 'no-store'
      }).catch(() => {
        // Se falhar, tentar sem o parâmetro
        return fetch(event.request, { cache: 'no-store' });
      })
    );
  }
});
