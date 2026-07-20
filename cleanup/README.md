# Pulizia automatica dei deployment Vercel

Il workflow `.github/workflows/cleanup-vercel-deployments.yml` conserva il deployment production generato dal commit corrente ed elimina tutti i deployment più vecchi del progetto Vercel `axante-lead-previews`.

## Attivazione automatica

Dopo aver eliminato dal repository un lead con `lifecycle_status = DELETE_REQUESTED`, creare nello stesso commit finale o in un commit successivo un file:

```text
cleanup/requests/YYYY-MM-DDTHH-MM-SS-{slug}.json
```

Contenuto obbligatorio:

```json
{
  "action": "delete_old_vercel_deployments",
  "approved": true,
  "keep_current_production": true,
  "reason": "Eliminazione completa di un lead",
  "deleted_slugs": ["nomeazienda-x7k2"]
}
```

Il push del file su `main` avvia automaticamente il workflow. Il workflow:

1. aspetta il deployment production relativo al commit della richiesta;
2. verifica che sia ancora il deployment production più recente;
3. protegge quel deployment;
4. elimina tutti i deployment più vecchi;
5. verifica che non ne rimangano.

Se nel frattempo viene pubblicato un commit più recente, la pulizia si interrompe per non cancellare accidentalmente il nuovo production.

I file di richiesta restano nel repository come registro delle operazioni eseguite.

## Attivazione manuale

Da GitHub Actions selezionare `Cleanup old Vercel deployments` e usare:

- confirmation: `DELETE_OLD_DEPLOYMENTS`
- dry_run: `true` per una simulazione oppure `false` per eliminare realmente.

## Configurazione richiesta

Nel repository deve esistere il secret GitHub Actions:

```text
VERCEL_TOKEN
```

Il token deve avere accesso al team e al progetto Vercel configurati nel workflow. Team ID e Project ID non sono segreti e sono già impostati nel file YAML.

Non inserire mai il token in file, commit, chat, batch o Google Sheets.
