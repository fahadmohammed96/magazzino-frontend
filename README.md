# Magazzino — Frontend

Dashboard interna per la gestione di catalogo, clienti e ordini di magazzino.
Le convenzioni operative del repository (stack, comandi, regole per gli agenti
di sviluppo) sono in **[AGENTS.md](./AGENTS.md)**: è la fonte di verità, questo
README è solo l'ingresso.

## Avvio rapido

```bash
npm ci            # installa le dipendenze
npm run dev       # dev server su http://localhost:3000
```

## Comandi

| Comando            | Cosa fa                                  |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Dev server                               |
| `npm run build`    | Build di produzione                      |
| `npm test`         | Unit/component test (Vitest)             |
| `npm run test:e2e` | Suite E2E (Playwright)¹                  |
| `npm run lint`     | ESLint                                   |

¹ Prima esecuzione: `npx playwright install --with-deps chromium`

## Flusso di lavoro

Consegne sempre via pull request verso `main` (branch protetto). La CI
esegue lint, unit test e build su ogni PR; la suite E2E gira post-merge.
