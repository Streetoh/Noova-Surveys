# Architecture — Youth Football Surveys PWA

## 1. Folder Map
```text
.
├── .github/workflows/deploy.yml  # GitHub Pages automated deployment
├── .env.example                  # VITE_FIREBASE_* environment variables
├── GEMINI.md                     # Commands & invariants
├── docs/ARCHITECTURE.md          # This file
├── public/
│   ├── icon.svg
│   ├── manifest.webmanifest
│   └── sw.js
├── scripts/
│   └── check-locales.mjs         # Validates et/en/ru/es key parity & non-empty values
└── src/
    ├── types/survey.ts           # Core TypeScript data models
    ├── i18n/                     # et.ts (master type), en.ts, ru.ts, es.ts, index.ts, i18n.test.ts
    ├── lib/                      # Pure domain modules + sibling *.test.ts
    ├── services/                 # Firebase init & isolated surveysRepo (surveys, survey_responses, survey_teams)
    ├── store/                    # Zustand store for language, PIN lock & ephemeral toasts
    ├── styles/                   # tokens.css & global.css (Linear × Hevy dark obsidian + cobalt)
    ├── components/               # Reusable UI components & QR Share modal
    └── views/                    # Coach views (PIN-gated) & isolated PlayerSurveyView
```

## 2. Core Data Models (`src/types/survey.ts`)

### Firestore Collection: `survey_teams`
```ts
{
  id: string;
  name: string;
  players: string[];               // Deduplicated & sorted alphabetically
  createdAt: number;
  updatedAt: number;
}
```

### Firestore Collection: `surveys`
```ts
{
  id: string;
  title: string;
  description: string;
  teamTag: string;
  teamId?: string;
  teamRosterSnapshot?: string[];   // Denormalized roster so Player view stays 1 getDoc
  closesAt?: number | null;        // Optional automatic close timestamp
  status: 'draft' | 'active' | 'closed';
  isTemplate: boolean;
  allowMultipleFromSameDevice: boolean;
  questions: Question[];
  responseCount: number;
  createdAt: number;
  updatedAt: number;
}
```

### Question Types
- `text` (`multiline: boolean`)
- `slider` (`min: number` default `0`, `max: number` default `10`, centered midpoint, Red→Amber→Green gradient)
- `rating10` (progressive semantic color 1–10 scale)
- `emoji5` (5 expressive faces mapped to 1–5)
- `choice` (`multiSelect?: boolean`, `options: ChoiceOption[]` with Yes/No preset)
- Each question supports `text: { et: string; en?: string; ru?: string; es?: string }` with automatic fallback.

### Firestore Collection: `survey_responses`
```ts
{
  id: string;
  surveyId: string;
  respondentName: string;          // Player real name (saved locally when not shared-device)
  locale: 'et' | 'en' | 'ru' | 'es';
  answers: Record<string, string | number>;
  submittedAt: number;
}
```

## 3. Firebase Isolation & Read Optimization
- Connects via `import.meta.env.VITE_FIREBASE_*` to the existing `Player-stats` project.
- Touches **only** `surveys` and `survey_responses`.
- `CoachDashboardView` subscribes to `surveys` only while mounted; `SurveyResultsView` subscribes to `survey_responses` filtered by `where('surveyId', '==', id)` only while mounted.
- `PlayerSurveyView` performs 1 `getDoc` on load and 1 `addDoc` + atomic `increment(1)` on `surveys/{id}.responseCount` on submit.
- When `.env` is not yet configured (local preview without Firebase keys), `surveysRepo` gracefully falls back to a local browser storage adapter and shows a clear configuration banner in the Coach panel.

## 4. Visual System Tokens
- Dark obsidian base (`#0b0c0e`, `#111317`, `#171a21`), hairline 1px dividers (`rgba(255,255,255,0.08)`), electric cobalt accent (`#3b82f6`).
- 2-column desktop workbench (`>= 1024px`) for Coach Dashboard, Survey Editor, and Live Results; mobile-first single-column touch-friendly flow (`>= 44px` targets, oversized `56px+` controls for kids/teens on Player screens).

## 5. Testing & Verification Strategy
- `npx tsc --noEmit` — Enforces strict `Translations` parity across `et`, `en`, and `ru` plus full type safety.
- `npm test` — Vitest unit tests for `analytics`, `validation`, `antispam`, `nicknames`, and `i18n`.
- `npm run check:locales` — CLI verification of `et`/`en`/`ru` parity.
- `npm run build` — Verifies clean GitHub Pages bundle with relative asset paths (`base: './'`).
