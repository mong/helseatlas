# Helseatlas

Dette er repositoriet for web-appen som viser sidene til helseatlas.

Utviklingsversjonen av web-appen blir kontinuerlig distribuert fra main-grenen til Microsoft Azure, og nettsiden finnes på https://analyser.skde.no.

## Kjør lokalt

Første gang: installer avhengighetene. GitHub Packages-tokenet for den private `@mong/material-ui`-pakken ligger i `.npmrc.local`, så bruk den filen som pnpm-konfigurasjon:

```bash
NPM_CONFIG_USERCONFIG=.npmrc.local pnpm install
```

`.env.local-db` inneholder lokale utviklingsverdier. Start PostgreSQL:

```bash
docker compose up -d --wait db
```

Kjør `pnpm dev` for å starte appen med `.env.local-db`. Hvis du med hensikt vil koble til en annen database og Azure Storage, bruk `pnpm dev:production-db`, som laster `.env.production-db`. Verdiene i den valgte filen overstyrer eventuelle tilsvarende miljøvariabler som allerede er satt i skallet.

Åpne [http://localhost:3000](http://localhost:3000). Docker Compose brukes bare til PostgreSQL; appen kjører direkte på maskinen din. Payload oppretter databaseskjemaet automatisk i utviklingsmodus, og innholdet lagres i Docker-volumet `postgres_data`.

PostgreSQL-databasen er tom ved første oppstart og får ikke innhold fra produksjon. Opplastede medier og datafiler lagres lokalt i `media/` og `datafiler/`, ikke i Azure.

Hvis du med hensikt vil utvikle mot produksjonsdatabasen og Azure Storage, opprett `.env.production-db` med disse verdiene:

```dotenv
POSTGRES_URI=your-database-uri
PAYLOAD_SECRET=local-payload-secret
PREVIEW_SECRET=local-preview-secret
USE_AZURE_STORAGE=true
AZURE_STORAGE_ACCOUNT_BASEURL=your-storage-account-base-url
AZURE_STORAGE_CONNECTION_STRING=your-storage-connection-string
AZURE_STORAGE_CONTAINER_NAME=your-container-name
```

Kjør deretter `pnpm dev:production-db`. Denne filen er gitignored. Koble bare til produksjon hvis du har tillatelse: appen bruker da Azure Storage-kontoen og databasen du oppgir. Payload kjører fortsatt i utviklingsmodus og kan automatisk endre databaseskjemaet, og appen kan skrive data til begge tjenestene.

I produksjon brukes `POSTGRES_URI` fra miljøet til produksjonsdatabasen, og Azure Storage-pluginen brukes for `media` og `datafiler`. Sett også `AZURE_STORAGE_ACCOUNT_BASEURL`, `AZURE_STORAGE_CONNECTION_STRING` og `AZURE_STORAGE_CONTAINER_NAME` i produksjonsmiljøet. Den lokale databasedefaulten og lokale filopplastinger er bare aktive når `NODE_ENV=development`.
