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

Du kan bygge et lokalt docker-image av web-appen.

```
docker build --secret id=node_auth_token,env=NODE_AUTH_TOKEN --secret id=payload_secret,env=PAYLOAD_SECRET --secret id=preview_secret,env=PREVIEW_SECRET --secret id=postgres_uri,env=POSTGRES_URI -t helseatlas .
docker run -p 3000:3000 --env-file .env.local helseatlas
```

