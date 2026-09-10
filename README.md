# IMACUL77 — Selected Projects

[![Live portfolio](https://img.shields.io/badge/Live%20portfolio-imacul77.vercel.app-171717?style=flat-square)](https://imacul77.vercel.app)

An immersive portfolio for **Emmanuel Oshakpemeh (IMACUL77)**, focused on frontend craft, fullstack systems, mobile products, and motion-led digital experiences.

![IMACUL77 portfolio hero](assets/hero-screenshot.png)

## Highlights

- Liquid, architectural WebGL scene with a curved two-sided project gallery.
- Responsive project browsing with Frontend, Fullstack, and Mobile filters.
- Ambient sound with an explicit silent mode and reduced-motion fallback.
- Accessible image-grid fallback when WebGL is unavailable.
- Editable project and interface content stored in `content/site.json`.

## Run locally

```bash
python -m http.server 4173 --bind 127.0.0.1
```

Open <http://127.0.0.1:4173/>.

## Project structure

- `film.js` — WebGL scene, gallery mesh, refraction, and ambient motion.
- `motion.js` — project data, filters, dialogs, cursor interaction, and audio controls.
- `styles.css` — layout, typography, responsive behavior, and accessibility states.
- `assets/logo-imacul.svg` — IMACUL77 monogram favicon and brand mark.

## Credits

The visual direction was studied from [Unseen Studio’s Projects page](https://unseen.co/projects/). The architectural scene, gallery renderer, and refraction shader are original implementation work. The bundled font and ambience file are documented in the source.