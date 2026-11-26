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
│   └── check-locales.mjs         # Validates et/en/ru key parity & non-empty values
└── src/
    ├── types/survey.ts           # Core TypeScript data models
    ├── i18n/                     # et.ts (master type), en.ts, ru.ts, index.ts, i18n.test.ts
    ├── lib/                      # Pure domain modules + sibling *.test.ts
    ├── services/                 # Firebase init & isolated surveysRepo (surveys, survey_responses)
    ├── store/                    # Zustand store for language, PIN lock & ephemeral toasts
    ├── styles/                   # tokens.css & global.css (Linear × Hevy dark obsidian + cobalt)
    ├── components/               # Reusable UI components & QR Share modal
    └── views/                    # Coach views (PIN-gated) & isolated PlayerSurveyView
```

## 2. Core Data Models (`src/types/survey.ts`)

### Firestore Collection: `surveys`
```ts
{
  id: string;
  title: string;
  description: string;
  teamTag: string;                 // e.g. "U10", "U12", "General"
  status: 'draft' | 'active' | 'closed';
  isTemplate: boolean;
  allowIdentityChoice: boolean;    // default true (real name OR pseudonym)
  allowMultipleFromSameDevice: boolean; // default false (antispam ON)
  questions: Question[];
  responseCount: number;           // denormalized counter for low-read list view
  createdAt: number;
  updatedAt: number;
}
```

### Question Types
- `text` (`multiline: boolean`)
- `slider` (`min: number`, `max: number`, `minLabel?: LocalizedText`, `maxLabel?: LocalizedText`)
- `rating10` (touch 1–10 numeric grid)
- `emoji5` (5 expressive faces mapped to 1–5)
- Each question supports `text: { et: string; en?: string; ru?: string }` with automatic fallback to `et` (or first non-empty text).

### Firestore Collection: `survey_responses`
```ts
{
  id: string;
  surveyId: string;
  respondentName: string;
  identityMode: 'name' | 'pseudonym';
  locale: 'et' | 'en' | 'ru';
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
