// La landing incrusta la app con ?embed=1: se lee una vez y no se quita de la URL, para que valga en recargas.
// Solo cuenta dentro de un marco: abierta como página (un enlace copiado, "abrir marco en otra pestaña") es la app normal.
// Los enlaces de las respuestas se abren en otra pestaña (Markdown.tsx), así que tampoco sacan al marco de la landing
export const EMBED = window.self !== window.top && new URLSearchParams(window.location.search).get('embed') === '1'
