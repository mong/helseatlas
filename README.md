# Helseatlas

Dette er repositoriet for web-appen som viser sidene til helseatlas.

Utviklingsversjonen av web-appen blir kontinuerlig distribuert fra main-grenen til Microsoft Azure, og nettsiden finnes på https://analyser.skde.no.

## Kjør lokalt

GitHub Packages-tokenet for den private `@mong/material-ui`-pakken må ligge i `.npmrc.local`, i dette formatet:

```
//npm.pkg.github.com/:_authToken=your-auth-token
```

Så kan pakker installeres slik:

```bash
NPM_CONFIG_USERCONFIG=.npmrc.local pnpm install
```

Start en local PostgreSQL-server med docker:

```bash
docker compose up -d --wait db
```

PostgreSQL-databasen er da tom. Opplastede medier og datafiler lagres lokalt i `media/` og `datafiler/`, ikke i Azure.
Hvis man har lyst på litt eksempel-data i den lokale databasen kan man kjøre dette:

```bash
pnpm seed:local-db
```

Så kan du kjøre appen med `pnpm dev`.


Hvis du med vil utvikle mot produksjonsdatabasen og Azure Storage, så må du opprette `.env.production-db` med disse verdiene:

```dotenv
POSTGRES_URI=your-database-uri
PAYLOAD_SECRET=your-payload-secret
PREVIEW_SECRET=your-preview-secret
USE_AZURE_STORAGE=true
AZURE_STORAGE_ACCOUNT_BASEURL=your-storage-account-base-url
AZURE_STORAGE_CONNECTION_STRING=your-storage-connection-string
AZURE_STORAGE_CONTAINER_NAME=your-container-name
```

Kjør deretter `pnpm dev:production-db`. Payload kjører fortsatt i utviklingsmodus og kan automatisk endre databaseskjemaet, og appen kan skrive data til begge tjenestene.