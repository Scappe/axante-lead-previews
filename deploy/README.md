# Pubblicazione finale senza deploy intermedi

I deploy automatici Git di Vercel sono disabilitati in `vercel.json`.

Durante la lavorazione è possibile creare tutti i commit necessari senza generare deployment Vercel. Prima della pubblicazione finale il sistema deve completare dati, siti, immagini, batch e QA.

Solo al termine deve creare un file:

```text
deploy/requests/YYYY-MM-DDTHH-MM-SS-{batch-id}.json
```

Contenuto obbligatorio:

```json
{
  "action": "deploy_final_production",
  "approved": true,
  "qa_passed": true,
  "expected_lead_count": 3,
  "batch_id": "axante-test-2026-07-20"
}
```

Il push del file su `main` avvia `.github/workflows/deploy-production.yml`.

La Action:

1. verifica la richiesta e il secret Vercel;
2. scarica le impostazioni production;
3. esegue build e QA Vercel localmente, senza creare deployment;
4. se la build fallisce si interrompe con zero nuovi deployment;
5. libera spazio eliminando i deployment storici e preservando il production corrente;
6. crea un solo deployment prebuilt production;
7. verifica il dominio production con HTTP 200;
8. elimina i deployment sostituiti e conserva soltanto il nuovo production.

Non creare il file di richiesta finché tutti i lead del batch non hanno superato il QA. Non modificare o creare una seconda richiesta mentre la Action è in esecuzione.
