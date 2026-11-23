import type { Payload } from "payload";
import sharp from "sharp";
import type { Datafiler, Media, Rapporter, Tag } from "../src/payload-types";

type UploadCollection = "media" | "datafiler";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

async function fetchResource(url: string): Promise<Response> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) {
    throw new Error(`Could not download ${url}: ${response.status} ${response.statusText}`);
  }
  return response;
}

export async function importReport(payload: Payload, reportURL: string): Promise<void> {
  const pageURL = new URL(reportURL);
  const match = pageURL.pathname.match(/^\/no\/rapporter\/([^/]+)\/?$/);
  if (!["http:", "https:"].includes(pageURL.protocol) || !match) {
    throw new Error(`Expected a Norwegian report URL (/no/rapporter/<slug>): ${reportURL}`);
  }
  const sourceURL = new URL("/api/rapporter", pageURL);
  sourceURL.searchParams.set("where[slug][equals]", decodeURIComponent(match[1]));
  sourceURL.searchParams.set("locale", "no");
  sourceURL.searchParams.set("depth", "2");
  sourceURL.searchParams.set("limit", "2");
  const apiURL = sourceURL.href;
  const result: { docs: Rapporter[]; totalDocs: number } =
    await (await fetchResource(apiURL)).json();
  if (result.totalDocs !== 1 || result.docs?.length !== 1) {
    throw new Error(`Expected exactly one report for ${reportURL}, found ${result.totalDocs}.`);
  }
  const report = result.docs[0];
  if (!report.slug || !report.title || !report.content?.root) {
    throw new Error(`Report at ${apiURL} is missing its slug, title or rich text.`);
  }
  if (report.relatedRapporter?.length) {
    throw new Error(`Report ${report.slug} has related reports; add support before importing it.`);
  }

  const existing = await payload.find({
    collection: "rapporter",
    where: { slug: { equals: report.slug } },
    locale: "no",
    limit: 1,
    overrideAccess: true,
  });
  if (existing.docs.length) {
    console.info(`Skipping existing report: ${report.slug}`);
    return;
  }

  async function folder(name: string): Promise<number> {
    const existing = await payload.find({
      collection: "payload-folders",
      where: { name: { equals: name } },
      limit: 1,
      overrideAccess: true,
    });
    return (existing.docs[0] ?? await payload.create({
      collection: "payload-folders",
      data: { name },
      overrideAccess: true,
    })).id;
  }

  const reportFolder = await folder(report.title);
  const mapFolder = await folder("kart");
  const uploads = new Map<string, number>();

  async function importUpload(
    collection: UploadCollection,
    reference: unknown,
    isMap = false,
  ): Promise<number> {
    const id = isRecord(reference) ? reference.id : reference;
    if (typeof id !== "number") {
      throw new Error(`Missing ${collection} ID in report ${report.slug}.`);
    }
    const key = `${collection}/${id}`;
    const cached = uploads.get(key);
    if (cached !== undefined) return cached;

    const remote: Media | Datafiler =
      await (await fetchResource(new URL(`/api/${key}?locale=no`, apiURL).href)).json();
    if (!remote.url || !remote.filename || !remote.mimeType) {
      throw new Error(`Upload ${key} is missing its URL, filename or MIME type.`);
    }
    const rasterize = collection === "media" && remote.mimeType === "image/svg+xml";
    const filename = rasterize ? `${remote.filename}.png` : remote.filename;
    const existing = await payload.find({
      collection,
      where: { filename: { equals: filename } },
      limit: 1,
      overrideAccess: true,
    });
    let localID = existing.docs[0]?.id;
    if (localID === undefined) {
      const response = await fetchResource(new URL(remote.url, apiURL).href);
      const original = Buffer.from(await response.arrayBuffer());
      // Rasterization preserves SVG figures without importing executable SVG content.
      const data = rasterize ? await sharp(original).png().toBuffer() : original;
      const file = {
        data,
        name: filename,
        mimetype: rasterize ? "image/png" : remote.mimeType,
        size: data.length,
      };
      const common = {
        folder: isMap ? mapFolder : reportFolder,
        focalX: remote.focalX,
        focalY: remote.focalY,
      };
      const options = {
        file,
        locale: "no" as const,
        overrideAccess: true,
        context: { disableRevalidate: true },
      };
      const doc = collection === "media"
        ? await payload.create({
          ...options,
          collection: "media",
          data: {
            ...common,
            alt: "alt" in remote ? remote.alt : "",
            caption: "caption" in remote ? remote.caption : undefined,
          },
        })
        : await payload.create({ ...options, collection: "datafiler", data: common });
      localID = doc.id;
      console.info(`Copied ${collection}: ${filename}${rasterize ? " (rasterized SVG)" : ""}`);
    }
    uploads.set(key, localID);
    return localID;
  }

  async function rewrite(value: unknown): Promise<unknown> {
    if (Array.isArray(value)) {
      const result = [];
      for (const child of value) result.push(await rewrite(child));
      return result;
    }
    if (!isRecord(value)) return value;
    const result = { ...value };
    if (value.relationTo && "value" in value) {
      if (value.relationTo !== "media" && value.relationTo !== "datafiler") {
        throw new Error(`Unsupported rich-text relationship: ${value.relationTo}`);
      }
      result.value = await importUpload(value.relationTo, value.value);
    }
    if (value.blockType === "resultBox") {
      result.media = await importUpload("datafiler", value.media);
      result.kart = await importUpload("datafiler", value.kart, true);
    } else if (value.blockType === "mediaBlock") {
      result.media = await importUpload("media", value.media);
    }
    // Other reports are not part of this seed; keep their links usable online.
    if (value.linkType === "custom" && typeof value.url === "string" &&
      value.url.startsWith("/") && !value.url.startsWith(`/no/rapporter/${report.slug}`)) {
      result.url = new URL(value.url, apiURL).href;
    }
    for (const [key, child] of Object.entries(result)) {
      result[key] = await rewrite(child);
    }
    return result;
  }

  const tags: number[] = [];
  for (const reference of report.tags ?? []) {
    const tag: Tag = typeof reference === "number"
      ? await (await fetchResource(new URL(`/api/tags/${reference}?locale=no`, apiURL).href)).json()
      : reference;
    const existing = await payload.find({
      collection: "tags",
      where: { identifier: { equals: tag.identifier } },
      limit: 1,
      overrideAccess: true,
    });
    tags.push((existing.docs[0] ?? await payload.create({
      collection: "tags",
      data: { title: tag.title, identifier: tag.identifier, description: tag.description },
      locale: "no",
      overrideAccess: true,
    })).id);
  }

  await payload.create({
    collection: "rapporter",
    data: {
      title: report.title,
      summary: report.summary,
      slug: report.slug,
      slugLock: report.slugLock,
      content: await rewrite(report.content) as Rapporter["content"],
      bilde: report.bilde ? await importUpload("media", report.bilde) : undefined,
      folder: reportFolder,
      tags,
      author: report.author,
      norskType: report.norskType,
      publiseringsStatus: report.publiseringsStatus,
      publishedAt: report.publishedAt,
      _status: report._status,
    },
    locale: "no",
    overrideAccess: true,
    context: { disableRevalidate: true },
  });
  console.info(`Imported report: /no/rapporter/${report.slug}`);
}
