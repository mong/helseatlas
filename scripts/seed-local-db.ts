import { getPayload } from "payload";

import config from "@payload-config";
import type { Rapporter } from "@/payload-types";

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

const reports = [
  {
    slug: "eksempel-behandling-hjerte-kar",
    title: "Eksempelrapport: Behandling ved hjerte- og karsykdommer",
    summary:
      "En eksempelrapport for å utforske rapportvisningen og fagområdet hjerte- og karsykdommer.",
    fagomrade: "hjerte-kar",
    paragraph:
      "Dette er eksempelinnhold for lokal utvikling. Tallene er ikke reelle helsedata.",
  },
];

function richText(text: string): Rapporter["content"] {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      children: [
        {
          type: "paragraph",
          format: "",
          indent: 0,
          version: 1,
          direction: "ltr",
          children: [
            {
              type: "text",
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text,
              version: 1,
            },
          ],
        },
      ],
      direction: "ltr",
    },
  };
}

assertLocalDockerDatabase();

const payload = await getPayload({ config });

try {
  const tagsByIdentifier = new Map<string, number>();

  for (const fagomrade of fagomrader) {
    const existing = await payload.find({
      collection: "tags",
      where: { identifier: { equals: fagomrade.identifier } },
      limit: 1,
      overrideAccess: true,
    });
    const tag =
      existing.docs[0] ??
      (await payload.create({
        collection: "tags",
        data: fagomrade,
        locale: "no",
        overrideAccess: true,
      }));
    tagsByIdentifier.set(fagomrade.identifier, tag.id);
  }

  const existingFolders = await payload.find({
    collection: "payload-folders",
    where: { name: { equals: "Eksempelrapporter" } },
    limit: 1,
    overrideAccess: true,
  });
  const folder =
    existingFolders.docs[0] ??
    (await payload.create({
      collection: "payload-folders",
      data: { name: "Eksempelrapporter" },
      overrideAccess: true,
    }));

  for (const report of reports) {
    const existing = await payload.find({
      collection: "rapporter",
      where: { slug: { equals: report.slug } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      console.info(`Skipping existing report: ${report.slug}`);
      continue;
    }

    const tagID = tagsByIdentifier.get(report.fagomrade);
    if (tagID === undefined) {
      throw new Error(`Missing seed fagområde: ${report.fagomrade}`);
    }

    await payload.create({
      collection: "rapporter",
      data: {
        title: report.title,
        summary: report.summary,
        content: richText(report.paragraph),
        folder: folder.id,
        author: "SKDE",
        norskType: "nb",
        publiseringsStatus: "published",
        publishedAt: new Date().toISOString(),
        tags: [tagID],
        slug: report.slug,
        _status: "published",
      },
      locale: "no",
      overrideAccess: true,
      context: { disableRevalidate: true },
    });
    console.info(`Created report: ${report.slug}`);
  }

  console.info(
    `Local seed complete: ${fagomrader.length} fagområder created, ${reports.length} example reports created.`,
  );
} finally {
  await payload.destroy();
}
