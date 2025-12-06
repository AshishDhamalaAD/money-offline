# Repository Guidelines

## Project Structure & Modules
- Frontend lives in `src/` with feature folders: `components/` (common + layout), `pages/` (route views), `store/` (Pinia), `db/` (Dexie schema, sync), `router/`, `utils/`, and `composables/`. Static assets sit in `src/assets/`.
- Entry points: `main.js` bootstraps Vue, `App.vue` hosts layout chrome. Routing is defined in `src/router/index.js` with lazy-loaded pages.
- Build tooling: Vite config in `vite.config.js`; Tailwind 4 setup in `tailwind.config.js` and `postcss.config.js`. Public, non-hashed assets live in `public/`.

## Build, Test, and Development
- `npm run dev` — start Vite dev server with HMR.
- `npm run build` — production build (checks for TypeScript/JS errors during bundling).
- `npm run preview` — serve the production build locally.
- Tests are not yet wired; if adding, prefer Vitest + Vue Test Utils and place specs near sources (`ComponentName.spec.js`).

## Coding Style & Naming
- Vue 3 with `<script setup>` and Composition API; prefer composables for shared logic and Pinia stores for state.
- Indentation: 2 spaces; keep files in UTF-8 ASCII. Use `@` alias for imports from `src/`.
- Components follow PascalCase filenames; composables use `useThing.js`; stores use `thingStore.js`.
- Tailwind-first styling; keep utility classes readable (group by layout/spacing/typography) and avoid inline styles.

## Testing Guidelines
- Add unit tests for data transforms (e.g., `utils/`, `db/sync/`) and critical UI flows (filters, charts).
- Name tests after behavior (“filters results by date range”), not implementation. Target meaningful coverage on store actions and Dexie interactions before shipping sync changes.

## Commit & Pull Requests
- Recent history uses Conventional Commit prefixes (`feat`, etc.); follow `type: concise summary` in present tense.
- PRs should include: scope/feature summary, screenshots or GIFs for UI changes (dark/light), steps to reproduce issues and verify fixes, and notes on offline/PWA impact if relevant.
- Keep changes scoped; update related docs (`project_features.md`, `project_technical_details.md`) when behavior or schema shifts.

## Security & Configuration
- Sensitive endpoints/tokens should live in env vars consumed by Dexie sync/upload services; avoid committing secrets.
- Test offline paths and biometric lock flows when touching auth, sync, or storage. Verify service worker is rebuilt (`npm run build`) after PWA-affecting changes.
