export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-6 px-6">
      <p className="text-muted text-sm tracking-wide uppercase">
        Scaffold iniziale
      </p>
      <h1 className="font-display text-4xl font-semibold">[NOME PROGETTO]</h1>
      <p className="text-lg leading-relaxed">
        Questo è il punto di partenza del progetto: struttura, token e
        strumenti sono pronti, il design e i contenuti arrivano con le issue
        di sviluppo. Le convenzioni del repository sono in{" "}
        <code className="rounded bg-primary/10 px-1.5 py-0.5 text-sm">
          AGENTS.md
        </code>
        .
      </p>
    </main>
  );
}
