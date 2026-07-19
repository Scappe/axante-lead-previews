# Axante Lead Previews

Repository indipendente per generare e pubblicare anteprime web personalizzate destinate ai lead di Axante.

## Principio

- Un solo repository e un solo progetto Vercel.
- Un file JSON per ogni lead in `leads/`.
- Una pagina privata generata in `/p/{slug}/`.
- Nessuna anteprima viene indicizzata o inserita in sitemap.
- Il sito istituzionale Axante resta completamente separato.

## Comandi

```bash
npm run build
npm run validate
```

La build genera la cartella `dist/`, pronta per Vercel.

## Struttura

```text
leads/                    dati delle aziende
schemas/                  contratto dei dati
scripts/                  generatore e controlli
public/                   asset condivisi
batches/drafts/           batch in lavorazione
batches/ready/            batch completi per n8n
```

## URL

Fase iniziale:

```text
https://dominio-vercel/p/nomeazienda-x7k2/
```

Dopo il collegamento del wildcard:

```text
https://nomeazienda-x7k2.demo.tuodominio.it/
```
