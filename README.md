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

Kommandoen beholder eksempel-fagområdene og importerer de norske versjonene av
«Helseatlas barn», «Helseatlas radiologi første del, MR» og «Rusbehandling for vaksne»
fra det offentlige Payload-API-et. Rapportenes riktekst, tagger,
bilder, diagramdata, kart og lenkede PDF-er kopieres til lokal database og lokal
fillagring. SVG-bilder rasteriseres til PNG for å unngå import av kjørbart
SVG-innhold. Bildestørrelser genereres lokalt, og produksjons-ID-er erstattes med
lokale ID-er. Internett er nødvendig under importen, men ikke for å vise de
importerte ressursene etterpå.

Med Azure Storage aktivert hentes diagramdata og kart fortsatt direkte fra Azure,
slik at produksjonsbygg ikke er avhengige av en kjørende Payload-server.

Rapportene finnes deretter under `/no/rapporter/barn2025`,
`/no/rapporter/radiologi` og `/no/rapporter/rus` på http://localhost:3000.
Vanlige rapportadresser som skal importeres, ligger i `reportURLs` i
[`scripts/seed-local-db.ts`](./scripts/seed-local-db.ts). Rapportene slås opp etter
slug via API-et, uten å være avhengige av produksjons-ID-er. Oppslaget må gi
nøyaktig én rapport. Eksisterende rapporter
(samme slug), tagger og opplastinger gjenbrukes, så kommandoen kan kjøres igjen
etter en avbrutt import. Eksisterende rapportinnhold oppdateres ikke.
Kun norsk innhold importeres. Lenker til andre rapporter peker fortsatt til
produksjon; disse rapportene og eksterne nettsider kopieres ikke. Importen stopper
med feil ved utilgjengelige ressurser eller relasjonstyper som ikke støttes,
inkludert rapporter med `relatedRapporter`.

Så kan du kjøre appen med `pnpm dev`.

For å tømme den lokale Docker-databasen, stopp først appen og kjør:

```bash
pnpm clear:local-db
```

Docker-tjenesten `db` må kjøre. Kommandoen sletter hele `public`-skjemaet og
oppretter det på nytt. Alle lokale data slettes, inkludert brukere og innhold som
ikke ble opprettet av seed-kommandoen. Produksjonsdatabasen berøres ikke.
Lokale filer i `media/` og `datafiler/` beholdes. Payload oppretter tabellene
igjen neste gang du kjører `pnpm dev` eller `pnpm seed:local-db`.


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