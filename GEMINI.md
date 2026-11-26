# Youth Football Surveys PWA — Engineering Map

## Overview
Real-time PWA for youth football coaches and players (kids & teens), ready for GitHub Pages (`base: './'` + `HashRouter`) and connected to an existing Firebase project (`Player-stats`) using strictly isolated collections: `surveys` and `survey_responses`.

## Languages
- Default: Estonian (`et`)
- Full parity: Estonian (`et`), English (`en`), Russian (`ru`)
- Strict TypeScript `Translations` type + `src/i18n/i18n.test.ts` + `scripts/check-locales.mjs`

## Folder Map
- `docs/ARCHITECTURE.md` — Living architecture specification (schemas, Firebase isolation, visual tokens, testing).
- `src/types/survey.ts` — Domain TypeScript interfaces (`Survey`, `Question`, `SurveyResponse`, `Locale`).
- `src/lib/` — Framework-free pure modules + sibling `*.test.ts`:
  - `analytics.ts` — Averages, distributions, CSV/JSON export
  - `validation.ts` — Required answers, survey validation, localized question text fallback
  - `antispam.ts` — Per-device submission lock + shared-device override
  - `nicknames.ts` — Localized friendly neutral nicknames (`et`, `en`, `ru`)
  - `templates.ts` — 3 built-in starter templates + clone/template helpers
  - `urls.ts` — GitHub Pages subpath-safe public survey link builder
- `src/i18n/` — `et.ts` (master `Translations` type), `en.ts`, `ru.ts`, `index.ts`, `i18n.test.ts`.
- `src/services/` — `firebase.ts` (env-based init), `surveysRepo.ts` (Firestore + local fallback if unconfigured).
- `src/store/` — `useAppStore.ts` (language, PIN auth state, coach UI state).
- `src/styles/` — `tokens.css` (Linear × Hevy obsidian/cobalt) and `global.css`.
- `src/components/` — `CoachShell.tsx`, `LanguageSwitcher.tsx`, `ShareSurveyModal.tsx`, `ConfirmModal.tsx`.
- `src/views/` — `CoachPinGate.tsx`, `CoachDashboardView.tsx`, `SurveyEditorView.tsx`, `SurveyResultsView.tsx`, `CoachSettingsView.tsx`, `PlayerSurveyView.tsx`.

## Commands
- `npm run dev` — Local Vite dev server
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Vitest unit tests (domain + i18n parity)
- `npm run check:locales` — CLI locale parity check (`et`, `en`, `ru`)
- `npm run build` — Production build for GitHub Pages (`dist/`)
- `npm run verify` — Full quality gate (`typecheck` + `test` + `check:locales` + `build`)

## Architectural Invariants
1. **Strict Firebase Isolation**: Never read or write outside `surveys` and `survey_responses`.
2. **Low Firestore Reads**: Attach `onSnapshot` only in active Coach List / Live Results views and unsubscribe immediately on unmount.
3. **Zero Untranslated Strings**: Every UI string passes through `t()`; `tsc --noEmit`, `i18n.test.ts`, and `scripts/check-locales.mjs` must pass.
4. **GitHub Pages Safe**: `base: './'` + `HashRouter` (`#/s/:id` public player route, `#/coach/*` private coach routes).
5. **Strict Access Separation**: Public player route contains zero links to coach panel, other surveys, or results.
