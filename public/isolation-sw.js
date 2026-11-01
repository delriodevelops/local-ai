// GitHub Pages no deja poner cabeceras HTTP. Este service worker añade las que activan el aislamiento
// entre orígenes (COOP/COEP), sin el cual el navegador no permite hilos en WebAssembly: los modelos
// que corren en el procesador usarían un solo núcleo.
// Solo toca los archivos de la propia web; las descargas de modelos (varios GB) pasan sin tocarlas.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', event => {
  const request = event.request
  if (new URL(request.url).origin !== self.location.origin) return
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return

  event.respondWith(
    fetch(request).then(response => {
      if (response.status === 0) return response
      const headers = new Headers(response.headers)
      // 'credentialless' deja cargar imágenes y vídeos de otros sitios (p. ej. fal.ai) sin pedirles cabeceras
      headers.set('Cross-Origin-Embedder-Policy', 'credentialless')
      headers.set('Cross-Origin-Opener-Policy', 'same-origin')
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
    }),
  )
})
