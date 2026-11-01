// La landing incrusta la app con ?embed=1: se lee una vez y no se quita de la URL, para que valga en recargas.
// Solo cuenta dentro de un marco: abierta como página (un enlace copiado, "abrir marco en otra pestaña") es la app normal
export const EMBED = window.self !== window.top && new URLSearchParams(window.location.search).get('embed') === '1'

// Incrustada, los enlaces (logo, respuestas del modelo) se abren fuera del marco, no dentro
if (EMBED) document.head.append(Object.assign(document.createElement('base'), { target: '_top' }))
