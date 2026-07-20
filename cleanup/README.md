# Pulizia automatica dei deployment Vercel

Il workflow `.github/workflows/cleanup-vercel-deployments.yml` elimina tutti i deployment del progetto tranne quello attualmente collegato al dominio production `axante-lead-previews.vercel.app`.

## Attivazione automatica

Dopo aver eliminato completamente un lead dal repository, creare:

```text
cleanup/requests/YYYY-MM-DDTHH-MM-SS-{slug}.json
```

```json
{
  "action": "delete_old_vercel_deployments",
  "approved": true,
  "keep_current_production": true,
  "reason": "Eliminazione completa di un lead",
  "deleted_slugs": ["nomeazienda-x7k2"]
}
```

Il workflow protegge il deployment associato al dominio production ed elimina gli altri, inclusi deploy falliti, annullati e vecchie preview.

## Attivazione manuale

Da GitHub Actions selezionare `Cleanup Vercel deployments` e usare:

- confirmation: `DELETE_OLD_DEPLOYMENTS`
- dry_run: `true` per simulare oppure `false` per eliminare realmente.

## Secret richiesto

Nel repository deve essere presente:

```text
VERCEL_TOKEN
```

Non inserire mai il token in codice, commit, chat, batch o Google Sheets.
