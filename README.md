# Helseatlas

Dette er repositoriet for web-appen som viser sidene til helseatlas.

Utviklingsversjonen av web-appen blir kontinuerlig distribuert fra main-grenen til Microsoft Azure, og nettsiden finnes på https://analyser.skde.no.

## Redirects

For å støtte internasjonalisering (i18n), blir sidene automatisk omdirigert fra roten `/` til `/no/`. Dette gjøres i middleware.tsx. For å legge til unntak fra denne regelen, se regex-mønsteret i middleware-koden.

## Kjør lokalt

Først kjører du utviklingsserveren:

```bash
pnpm dev
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren din for å se resultatet.

## Docker

Du kan bygge et lokalt docker-image av web-appen.

```
docker build . -t oppdaterte-analyser/nextjs
docker run -p 3000:3000 oppdaterte-analyser/nextjs
```

