import { getPayload } from "payload";

import config from "@payload-config";
import { importReport } from "./import-report";

const localDatabaseURI = process.env.POSTGRES_URI;

function assertLocalDockerDatabase(): void {
  if (process.env.SEED_LOCAL_DOCKER_DB !== "1") {
    throw new Error("Refusing to seed: run this script with pnpm seed:local-db.");
  }

  if (!localDatabaseURI) {
    throw new Error("Refusing to seed: POSTGRES_URI is not set.");
  }

  let databaseURL: URL;
  try {
    databaseURL = new URL(localDatabaseURI);
  } catch {
    throw new Error("Refusing to seed: POSTGRES_URI is not a valid URL.");
  }

  const databaseName = decodeURIComponent(databaseURL.pathname.replace(/^\/+/, ""));
  if (
    !["postgres:", "postgresql:"].includes(databaseURL.protocol) ||
    !["127.0.0.1", "localhost"].includes(databaseURL.hostname) ||
    databaseURL.port !== "5432" ||
    databaseName !== "helseatlas"
  ) {
    throw new Error(
      "Refusing to seed: POSTGRES_URI must point to the local Docker database (127.0.0.1:5432/helseatlas).",
    );
  }

  if (process.env.USE_AZURE_STORAGE === "true") {
    throw new Error("Refusing to seed while Azure Storage is enabled.");
  }
}

const fagomrader = [
  { identifier: "kreft", title: "Kreft" },
  { identifier: "hjerte-kar", title: "Hjerte- og karsykdommer" },
  { identifier: "psykisk-helse", title: "Psykisk helse" },
  { identifier: "muskel-skjelett", title: "Muskel- og skjelettsykdommer" },
];

const reportURLs = [
  "https://analyser.skde.no/no/rapporter/barn2025",
  "https://analyser.skde.no/no/rapporter/radiologi",
  "https://analyser.skde.no/no/rapporter/rus",
];

assertLocalDockerDatabase();

const payload = await getPayload({ config });

try {
  for (const fagomrade of fagomrader) {
    const existing = await payload.find({
      collection: "tags",
      where: { identifier: { equals: fagomrade.identifier } },
      limit: 1,
      overrideAccess: true,
    });
    if (!existing.docs.length) {
      await payload.create({
        collection: "tags",
        data: fagomrade,
        locale: "no",
        overrideAccess: true,
      });
    }
  }

  for (const reportURL of reportURLs) {
    await importReport(payload, reportURL);
  }

  console.info(
    "Local seed complete. Fagområder and reports are available.",
  );
} finally {
  await payload.destroy();
}
