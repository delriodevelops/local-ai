// La landing incrusta la app con ?embed=1: se lee una vez y no se quita de la URL, para que valga en recargas
export const EMBED = new URLSearchParams(window.location.search).get('embed') === '1'

// Incrustada, los enlaces (logo, respuestas del modelo) se abren fuera del marco, no dentro
if (EMBED) document.head.append(Object.assign(document.createElement('base'), { target: '_top' }))
