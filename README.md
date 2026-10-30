# Rich Text Online Editor

A single-page **WYSIWYG** editor for HTML and Markdown, using Vue 3, TinyMCE 8 (GPL self-hosted), Vite, Tailwind CSS and shadcn-vue style components.

## Features

- Visual editing (no Markdown syntax required): tables, lists, links, images, HTML code and fullscreen.
- Copy HTML, Markdown (GitHub Flavored Markdown), and plain text to the clipboard.
- Import .md, .markdown, .html, .htm, and .txt.
- Download HTML or Markdown directly. When the document contains images, export either HTML + images ZIP or Markdown + images ZIP, with images extracted to assets/.
- Paste, drag/drop, or choose images; images are embedded as Base64 data URLs.
- One autosaved draft stored in browser IndexedDB; no account or backend.
- Light/dark/system theme, Traditional Chinese and English UI.
- Installable PWA: manifest and PNG icons only, no service worker, **no offline support**.

## Deployment — no computer build required

1. On GitHub, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
2. Commit any change to the main branch, including edits made on github.com.
3. GitHub Actions installs packages, runs a TypeScript check and Vite build, then publishes dist/ to GitHub Pages.

Website: https://pulipulichen.github.io/Rich-Text-Online-Editor/

Because this initial release has no committed package-lock.json, the workflow runs npm install. If a package-lock.json is later committed, it automatically switches to npm ci.

## Optional local development

    npm install
    npm run dev
    npm run build

## Notes

- Markdown export cannot preserve every HTML-only rich text style; use HTML export for maximum formatting fidelity.
- Base64 images can create large local drafts. When images exist, ZIP export uses DEFLATE compression to package an HTML or Markdown document with referenced image assets. External images must be CORS-accessible to package; if they cannot be fetched, the export reports an error instead of silently omitting them.
- Local drafts are specific to the browser and device; clearing site data may remove them.
- The site must be online to open or reload. Installing it does not provide offline capability.
- TinyMCE is self-hosted under its GPL mode with license_key: 'gpl'. The project license is GPL-3.0.
