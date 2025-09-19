# Auto-posts para GitHub Pages (sin arrays manuales)

Este parche hace que tu sitio:
- **Descubra automáticamente** todos los `.md` dentro de `/posts` usando la **GitHub REST API**.
- Renderice Markdown en el navegador con `marked.min.js`.
- Use URLs limpias con `/?post=slug` (sin `#`).
- Incluya buscador, tema claro/oscuro y reproductor de audio visible.

## Requisitos
- El repositorio debe ser **público** (la API de GitHub se consulta sin token).
- Estructura esperada:
  - `index.html`
  - `script.js`
  - `js/marked.min.js`
  - `style.css`
  - `assets/` (tu música opcional en `assets/music.*`)
  - `posts/*.md`

## ¿Y si el repo es privado?
- Puedes mantener un `posts/manifest.json` con un arreglo de objetos `{ "slug": "...", "title": "...", "excerpt": "..." }` y el script hará *fallback* automáticamente.

## Project vs User Pages
- Si tu repo es **User/Org Pages** (p.ej. `mortensudoers.github.io`), la detección del dueño/repo es automática.
- Si es **Project Pages** (p.ej. `morten-sudoers.github.io/miweb`), añade en `<body>` los atributos `data-owner` y `data-repo`:
  ```html
  <body data-owner="morten-sudoers" data-repo="miweb">
  ```

## Publicación
1. Sube todo a la rama `main` (raíz del repo Pages).
2. Settings → Pages → *Deploy from a branch* → `main` / `/root`.
3. Abre: `https://<usuario>.github.io/`

## Agregar un nuevo post
- Solo sube un nuevo `.md` dentro de `/posts` (por ejemplo `nuevo-post.md`).
- Se indexará **automáticamente**; no hay que tocar `script.js`.
- Accede con `/?post=nuevo-post`.