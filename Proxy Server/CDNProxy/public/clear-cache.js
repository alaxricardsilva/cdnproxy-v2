
// Script para limpeza automática de cache do navegador
(function() {
  console.log('🧹 Iniciando limpeza de cache do navegador...');
  
  // 1. Limpar cache do navegador via Cache API
  if ('caches' in window) {
    caches.keys().then(function(names) {
      names.forEach(function(name) {
        console.log('🗑️ Removendo cache:', name);
        caches.delete(name);
      });
    });
  }
  
  // 2. Limpar localStorage
  if (typeof Storage !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
    console.log('🗑️ localStorage e sessionStorage limpos');
  }
  
  // 3. Forçar reload de todos os recursos com timestamp
  const resources = document.querySelectorAll('link[rel="stylesheet"], script[src]');
  resources.forEach(function(resource) {
    if (resource.href || resource.src) {
      const url = resource.href || resource.src;
      const separator = url.includes('?') ? '&' : '?';
      const newUrl = url + separator + '_nocache=' + Date.now();
      
      if (resource.href) {
        resource.href = newUrl;
      } else {
        resource.src = newUrl;
      }
    }
  });
  
  console.log('✅ Limpeza de cache concluída');
})();
