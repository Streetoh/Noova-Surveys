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
    ├── types/survey.ts           # Core TypeScript data models (incl. bodymap, polarity, quickChips, maxSelections)
    ├── i18n/                     # et.ts (master type), en.ts, ru.ts, es.ts, index.ts, i18n.test.ts
    ├── lib/                      # Pure domain modules (analytics, bodymap, dial, roster, validation, templates, antispam) + *.test.ts
    ├── services/                 # Firebase init (IndexedDB cache) & isolated surveysRepo (surveys, survey_responses, survey_teams)
    ├── store/                    # Zustand store for language, PIN lock & ephemeral toasts
    ├── styles/                   # tokens.css & global.css (Athletic Volt dark palette)
    ├── components/               # CoachShell (topbar + Bottom Dock), SemicircularDial, BodyMapSvg, ShareSurveyModal, ConfirmModal
    └── views/                    # Coach views (PIN-gated) & Stories-mode PlayerSurveyView
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
  teamRosterSnapshot?: string[];   // Denormalized roster so Player & Results stay 1 getDoc
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

### Question Types & Options
- `text`: optional `multiline` + `quickChips?: string[]` (tappable chips appended/removed from answer)
- `slider`: interactive Semicircular Dial (`min` default `1`, `max` default `10`, `minLabel`, `maxLabel`, `polarity`)
- `rating10`: interactive Semicircular Dial (`1–10`, `polarity`)
- `emoji5`: 5 expressive faces mapped to `1–5` (`polarity`)
- `choice`: `multiSelect?: boolean`, `maxSelections?: number | null` ("Top N" limit), `options: ChoiceOption[]`
- `bodymap`: Dual Front/Back SVG silhouettes with 15 anatomical zones (`shoulder_r/l`, `back`, `hip_r/l`, `quad_r/l`, `hamstring_r/l`, `knee_r/l`, `calf_r/l`, `ankle_r/l`) + `"none"` (All good)
- Each numeric question supports `polarity?: 'positive' | 'inverse' | 'neutral'` and `highlightInSummary?: boolean`.
- Each question supports `text: { et: string; en?: string; ru?: string; es?: string }` with automatic fallback.

### Firestore Collection: `survey_responses`
```ts
{
  id: string;
  surveyId: string;
  respondentName: string;          // Player real name
  locale: 'et' | 'en' | 'ru' | 'es';
  answers: Record<string, string | number | string[]>;
  submittedAt: number;
}
```

## 3. Firebase Isolation & Read Optimization
- Connects via `import.meta.env.VITE_FIREBASE_*` to the `Player-stats` project with persistent IndexedDB cache (`persistentLocalCache` + `persistentMultipleTabManager`).
- Touches **only** `surveys`, `survey_responses`, and `survey_teams`.
- **Zero listeners on Coach Dashboard / Editor / Teams / Player views** (all use one-shot `getDocs` / `getDoc`).
- **Scoped real-time listener**: `SurveyResultsView` opens `onSnapshot` ONLY while `!isSurveyEffectivelyClosed(survey)`; closed or expired surveys use one-shot `getDocs`.
- `PlayerSurveyView` performs 1 `getDoc` on load (including `teamRosterSnapshot`) and 1 `addDoc` + atomic `increment(1)` on `surveys/{id}.responseCount` on submit.

## 4. Visual System Tokens (Athletic Volt)
- High-contrast dark base (`#0B0E14`), card surface (`#141923`), electric lime primary accent (`#B8FF2C`), alert/discomfort coral (`#FF5A5F`).
- **Coach**: Minimal top bar (`<- Back`, title, `ET/EN/RU/ES`, Lock) + fixed 3-tab Bottom Dock (**Surveys**, **Teams**, **Settings**).
- **Editor**: Title + Team header, closed-by-default `"More options"` accordion, horizontal swipeable question carousel + `+` FAB + Bottom Sheet, sticky `"Activate & share"` footer.
- **Player**: Stories-mode full-screen card with segmented top bar, manual **"Continue" / "Submit"** button, Semicircular Dial, Dual Body Map, and lime confirmation check.
- **Results**: Top Bento Grid (clickable circular participation ring + independent per-question KPI cards, never cross-question averages), compact vertical bar histograms, 100%-width horizontal choice bars, and Body Map team heatmap.

## 5. Testing & Verification Strategy
- `npx tsc --noEmit` — Enforces strict `Translations` parity across `et`, `en`, `ru`, and `es` plus full type safety.
- `npm test` — Vitest unit tests (`analytics`, `bodymap`, `dial`, `validation`, `roster`, `antispam`, `i18n`).
- `npm run check:locales` — CLI verification of `et`/`en`/`ru`/`es` parity.
- `npm run build` — Verifies clean GitHub Pages bundle with relative asset paths (`base: './'`).
