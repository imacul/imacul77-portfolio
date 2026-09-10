# IMACUL77 — Selected Projects

A local, dependency-free portfolio recreation based on the visual direction of https://unseen.co/projects/.

## Preview

Run `python -m http.server 4173 --bind 127.0.0.1` from this directory, then open http://127.0.0.1:4173/.

- Scroll or drag with a mouse to explore the gallery.
- Choose Frontend, Fullstack, or Mobile to filter the projects.
- Enter with sound, or use the bottom-left button to enable/mute the looping ambience.
- Index opens the introduction; Contact scrolls to the contact section.
- Project cards link to the existing GitHub project URLs.
- Reduced-motion preferences and unavailable WebGL use a normal accessible image grid.

## Files

`film.js` draws the original architectural scene, animated butterflies, a continuous two-sided gallery mesh with mipmapped textures, and the WebGL refraction pass. `motion.js` holds project data and interaction/audio controls. `styles.css` handles typography, overlays, and responsive layout.

The previous implementation is preserved in `.backup/`. `water.js` is the previous, unused effect and is not loaded.

## Reference asset provenance

The following assets were downloaded from the observed Unseen page for the requested local recreation. Their ownership remains with their respective owners; no redistribution license is included in this project.

- `assets/neue-montreal.woff2`: https://unseen.co/wp-content/themes/unseen/resources/assets/fonts/NeueMontreal-Regular.woff2
- `assets/ambience.webm`: https://unseen.co/wp-content/themes/unseen/resources/assets/audio/audio.webm

All gallery images, project names, contact details, and GitHub URLs come from the existing portfolio. The architectural background, butterflies, gallery renderer, and refraction shader are new code rather than the reference site's models or source code.

The gallery rolls over a fixed-radius curve that begins lower in the viewport. Its reverse side remains visible past the crest. Slow full-surface currents animate independently of pointer input; reduced-motion mode remains static.

## Editing without touching code

Content lives in [`content/site.json`](content/site.json). The site loads it at runtime, with built-in defaults if the file cannot be reached.

For a visual editor, open `/admin/` after deploying the repository. The included Decap CMS configuration edits the same JSON file and supports project images, links, categories, hero copy, entry copy, and footer text. Decap is free and Git based. This deployment uses the GitHub backend and the private `imacul/portfolio` repository. GitHub OAuth credentials may be required for the first CMS login.
