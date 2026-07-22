# Progetto

Dashboard interna per la **gestione degli ordini di magazzino**. La usano solo
utenti interni — magazzinieri, operatori, amministratori — con login e 2 ruoli
(Admin, Operatore). Copre catalogo prodotti, anagrafica clienti, ordini e
giacenze; consuma le API del backend `magazzino-backend`.
_(Decisioni raccolte nella scoperta di kickoff — issue MYL-9.)_

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
- Dark mode: sì — con toggle utente (dashboard interna). _(Decisione kickoff.)_
- Motion: transizioni 150–300ms; `prefers-reduced-motion` è già gestito
  globalmente in `globals.css`, le animazioni custom devono rispettarlo

# Layer server del framework (competenza del team frontend)

- Route handlers/server components in `app/` secondo le convenzioni Next
- Variabili d'ambiente mai esposte al client se non prefissate `NEXT_PUBLIC_`
- Backend/API: questo frontend consuma il servizio `magazzino-backend`
  (FastAPI). La fonte del contratto è l'OpenAPI generato dal backend
  (`/openapi.json`); base URL configurata via `NEXT_PUBLIC_API_BASE_URL`.
  Gli endpoint di dettaglio (catalogo, clienti, ordini, giacenze) si fissano
  nelle issue di Fase 2 PRIMA dei rispettivi consumatori.

# Contenuti

- Applicazione gestionale interna: nessun contenuto editoriale/marketing.
  I dati reali arrivano dal backend; in loro assenza usare stati vuoti o
  skeleton, non testi `[PLACEHOLDER]` pubblicati.

# Deploy

- Deploy: da definire quando servirà (non è un task della squad). Ambiente
  interno; candidati Vercel o container. _(Decisione kickoff: rimandato.)_
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
