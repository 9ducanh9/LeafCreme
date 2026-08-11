# Leaf Crème storefront UI baseline

Captured during the Soft Craft redesign pass on 2026-08-11.

## Build evidence

- `npx.cmd tsc --noEmit`: PASS.
- `npx.cmd vite build --outDir ../.codex-dist`: PASS.
- Output bundle: CSS 44.19 kB (8.86 kB gzip); JavaScript 1,417.82 kB (409.72 kB gzip).
- Vite still reports a large-chunk warning and stale browser-data warnings; these are follow-up performance work, not build failures.

## Accessibility and performance

- Lighthouse: not run in this workspace because no browser audit session was available.
- Manual implementation checks cover skip-link focus, route announcements, visible `:focus-visible` states, reduced motion, semantic form errors, and mobile navigation.
- Contrast verification was inherited from the supplied redesign verification notes; refresh it against the deployed build before release.

This file intentionally separates measured local build results from audits that have not been run.
