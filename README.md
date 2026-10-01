# Helseatlas

Dette er repositoriet for web-appen som viser sidene til helseatlas.

Utviklingsversjonen av web-appen blir kontinuerlig distribuert fra main-grenen til Microsoft Azure, og nettsiden finnes på https://analyser.skde.no.

## Kjør lokalt

Først kjører du utviklingsserveren:

```bash
pnpm dev
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren din for å se resultatet.

## Docker

Builden genererer statiske sider fra PostgreSQL, så start den lokale databasen før du bygger appen. Sett `POSTGRES_URI` i `.env.local` til den lokale URI-en `postgres://postgres:postgres@localhost:5432/helseatlas`.

```bash
docker compose --env-file .env.local up -d db
docker compose --env-file .env.local build app
docker compose --env-file .env.local up -d app
```

Appen er tilgjengelig på [http://localhost:3000](http://localhost:3000). `.env.local` må også inneholde verdiene for `NODE_AUTH_TOKEN`, `PAYLOAD_SECRET` og `PREVIEW_SECRET`. Builden kobler til PostgreSQL i Compose via Docker BuildKit sin `network.host`-tilgang, som må være tillatt av BuildKit-builderen. Databasen oppretter Payload-skjemaet ved oppstart, og innholdet lagres i et Docker-volum. Legg inn innhold før app-byggingen dersom det skal med i de statisk genererte sidene; sidene oppdateres deretter med 60 sekunders revalidering.
