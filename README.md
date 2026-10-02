# Maxo · PIEZAS

Web artística de Maxo, publicada en <https://maxo-art.vercel.app>. HTML, CSS y JavaScript sin build, con GSAP + ScrollTrigger (incluidos en `js/vendor/`).

## Verla en tu compu

Con doble clic en `index.html` no anda: el navegador no deja leer `data/obras.json`. Levantá un servidor desde esta carpeta:

```
python -m http.server 5500
```

y abrí <http://localhost:5500>. También sirve `npx serve .` o la extensión Live Server de VS Code.

## Todo lo que se edita está en `data/obras.json`

- `""` significa que no hay: no se muestra nada (por ejemplo, una película sin video).
- `"[PENDIENTE]"` significa que falta completarlo: se muestra marcado para que se note.
- El orden del archivo es el orden del tablero.

### Sumar una canción

Agregá un bloque en `"canciones"`. Mientras no salió, alcanza con esto y aparece como hueco:

```json
{ "id": "madrugada", "titulo": "Madrugada", "estado": "proximamente", "nota": "Trap más pesado." }
```

Con `"adelanto": "img/obras/nombre-adelanto.webp"` (una versión tramada y chica de la portada) la portada se asoma entre las rayas del hueco. Sin esa línea, el hueco no muestra nada.

Cuando sale, cambiá `"estado"` a `"publicada"` y completá el resto (los valores son de ejemplo):

```json
{
  "id": "nombre-del-tema",
  "titulo": "Nombre del tema",
  "estado": "publicada",
  "artistas": "Maxo, quien participe",
  "fecha": "2026-12-01",
  "duracion": "3:05",
  "bpm": 120,
  "portada": "img/obras/nombre-del-tema.webp",
  "portadaAlt": "Qué se ve en la portada",
  "creditos": [
    { "rol": "Producción", "nombre": "Quien la produjo" }
  ],
  "letra": "Primer verso\nSegundo verso",
  "spotify": "https://open.spotify.com/track/...",
  "appleMusic": "https://music.apple.com/...",
  "youtubeMusic": "https://music.youtube.com/watch?v=...",
  "youtube": "https://www.youtube.com/watch?v=..."
}
```

La portada va cuadrada y en WebP en `img/obras/` (podés convertirla en <https://squoosh.app>). La pieza se genera sola y encaja con las demás. Con el link de `spotify` o de `youtube`, la ficha muestra el reproductor, que carga recién cuando lo tocás.

`"fecha"` va como año-mes-día y se muestra como "1 de diciembre de 2026". Si no sabés el día, usá `"anio": "2026"` en su lugar.

`"piezaDeLaPortada": true` es solo para Sin Rumbo: dibuja su pieza agrietada en lugar de la portada.

**Cuando salga Boleto:** copiá la portada en `img/obras/boleto.webp`, cambiá `"estado"` a `"publicada"` y completá el resto. Hasta entonces su portada no está en la web, a propósito.

### Sumar una película

Agregá un bloque en `"peliculas"`:

```json
{
  "id": "nombre-corto",
  "titulo": "Título",
  "formato": "Cortometraje",
  "anio": "2025",
  "direccion": "Nombre de quien dirigió",
  "personaje": "Tu personaje",
  "sinopsis": "Una línea.",
  "nota": "Dato extra, opcional.",
  "video": "https://www.youtube.com/watch?v=...",
  "videoEs": "completo",
  "fotograma": "img/peliculas/nombre-corto.webp",
  "fotogramaAlt": "Qué se ve en el fotograma"
}
```

El fotograma va panorámico (más ancho que alto) en `img/peliculas/`. Si es chico (menos de 900 px de ancho) queda tramado para que no se vea borroso.

`"videoEs"` es `"completo"` (el botón dice "Ver el corto" o "Ver la película") o `"trailer"` ("Ver tráiler"). Si el video es de YouTube, se reproduce adentro del cuadro y respeta el minuto de inicio del link (`&t=259s`). Si es otro link, aparece un botón. Si no hay, poné `""` y no aparece nada.

### Mail y redes

En `"contacto"`, arriba de todo en el mismo archivo. Si una red todavía no existe, poné `"url": "próximamente"` y aparece así, sin link.

## Lo que está en `index.html`

- El texto de **Sobre mí** y tu foto (`img/maxo.webp`).
- Los metadatos para compartir, con el dominio `maxo-art.vercel.app`. Si algún día sumás un dominio propio, cambialo ahí.

## Publicar en Vercel

1. Subí esta carpeta a un repo nuevo de GitHub.
2. En Vercel: **Add New → Project**, importá el repo, elegí el framework **Other** y dejá vacío el comando de build.
3. Cada cambio que subas al repo se publica solo.
