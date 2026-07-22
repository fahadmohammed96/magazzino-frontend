# Progetto

[DECISIONE] Cosa fa questo progetto e per chi — definire in Fase 1 del kickoff.

# Stack

- Next.js 15 (App Router) + React 19, TypeScript strict
- Styling: Tailwind CSS 4 — token in `app/globals.css` (blocco `@theme`)
- Package manager: npm — usa SOLO questo (`npm ci` per installare)
- Test: Vitest + React Testing Library; E2E: Playwright
- Node 22

# Comandi (verificati sul repo pulito)

- Dev server: `npm run dev` → http://localhost:3000
- Build: `npm run build`
- Unit/component test: `npm test` — la suite deve passare prima di ogni PR
- E2E: `npm run test:e2e` (prima volta: `npx playwright install --with-deps chromium`)
- Lint: `npm run lint` — il codice consegnato passa il lint

# Struttura

- `app/` — route, layout, pagine (App Router); test accanto al codice in `__tests__/`
- `components/` — componenti riusabili; un componente per file, PascalCase
- `lib/` — utility e hook condivisi
- `e2e/` — suite end-to-end: di proprietà ESCLUSIVA dell'agente QA E2E
- `.github/workflows/ci.yml` — lint + test + build su ogni PR; E2E post-merge

# Convenzioni di codice

- Componenti PascalCase, file utility kebab-case, import assoluti da `@/`
- Niente `any`; tipi espliciti sulle API pubbliche dei moduli
- Le API pubbliche dei moduli hanno docstring/commento secondo necessità

# Design system

- Token: SOLO in `app/globals.css` (`@theme`). Mai valori hardcoded di
  colore, spaziatura fuori scala, font o raggi nei componenti.
- I valori attuali dei token sono NEUTRI di partenza: la palette e la
  tipografia definitive si decidono con l'issue di design e si aggiornano
  solo nel blocco `@theme`.
- Contrasto minimo: WCAG 2.2 AA (4.5:1 testo normale, 3:1 testo grande)
- Breakpoint: default Tailwind (sm 640 / md 768 / lg 1024 / xl 1280)
- Dark mode: [DECISIONE] sì/no — definire in Fase 1
- Motion: transizioni 150–300ms; `prefers-reduced-motion` è già gestito
  globalmente in `globals.css`, le animazioni custom devono rispettarlo

# Layer server del framework (competenza del team frontend)

- Route handlers/server components in `app/` secondo le convenzioni Next
- Variabili d'ambiente mai esposte al client se non prefissate `NEXT_PUBLIC_`
- [DECISIONE] Backend/API esterne: al momento NESSUNO (sito statico).
  Se la Fase 2 prenotazioni verrà attivata, aggiornare questa sezione con
  il contratto.

# Contenuti

- [DECISIONE] Foto e testi reali: in arrivo / disponibili in [percorso].
  Fino ad allora ogni contenuto provvisorio è marcato `[PLACEHOLDER]` nel
  testo visibile: il sito NON va pubblicato finché esistono placeholder.

# Deploy

- [DECISIONE] Dove e come va online (es. Vercel/Netlify con deploy
  automatico da `main`) — definire in Fase 1.
- Il deploy NON è mai un task della squad: è un automatismo di
  piattaforma o un gesto umano.
- Variabili d'ambiente richieste: dichiarate in `.env.example` (nomi e
  descrizione, MAI valori).

# Flusso di lavoro

- I task arrivano come issue su Multica; consegne SEMPRE via PR verso
  `main` (protetto), mai push diretto
- Ogni PR include la nota di consegna nel formato definito dalle
  istruzioni dell'agente
- La CI (lint + unit test + build) deve essere verde perché la PR sia
  approvabile; la suite E2E gira post-merge su `main`
- Fuori scope per questo repo: servizi backend dedicati, database,
  contratti API condivisi, auth server-side → segnalare sull'issue, non
  implementare
