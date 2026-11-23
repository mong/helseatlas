import assert from "node:assert/strict";
import { test } from "node:test";
import { importReport } from "./import-report.ts";

const reportURL = "https://example.test/no/rapporter/barn2025";

function fixture(t) {
  const report = {
    slug: "barn2025",
    title: "Helseatlas barn",
    summary: "Summary",
    author: "SKDE",
    norskType: "nb",
    _status: "published",
    bilde: { id: 498 },
    tags: [{ identifier: "barn", title: "Barn" }],
    content: {
      root: {
        type: "root",
        children: [
          { type: "block", fields: {
            blockType: "resultBox",
            media: { id: 336 },
            kart: 18,
            diskusjon: { root: { children: [
              { type: "block", fields: { blockType: "mediaBlock", media: 498 } },
              { type: "link", fields: {
                linkType: "internal",
                doc: { relationTo: "datafiler", value: { id: 45 } },
              } },
            ] } },
          } },
          { type: "link", fields: { linkType: "custom", url: "/no/rapporter/bup" } },
          { type: "link", fields: { linkType: "custom", url: "#om-atlaset" } },
        ],
      },
    },
  };
  const created = [];
  const requests = [];
  const failures = new Set();
  const lookup = { docs: [report], totalDocs: 1 };
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(input);
    requests.push(url.href);
    if (failures.has(url.pathname)) return new Response("Not found", { status: 404 });
    if (url.pathname === "/api/rapporter") {
      assert.equal(url.searchParams.get("where[slug][equals]"), "barn2025");
      assert.equal(url.searchParams.get("locale"), "no");
      assert.equal(url.searchParams.get("depth"), "2");
      return Response.json(lookup);
    }
    const match = url.pathname.match(/^\/api\/(media|datafiler)\/(\d+)$/);
    if (match) {
      return Response.json({
        id: Number(match[2]),
        filename: `${match[2]}.json`,
        url: `/files/${match[2]}.json`,
        mimeType: "application/json",
        alt: "Image description",
      });
    }
    if (url.pathname.startsWith("/files/")) return new Response('{"data":true}');
    throw new Error(`Unexpected request: ${url}`);
  });
  const payload = {
    find: async ({ collection, where }) => ({
      docs: created.filter((doc) =>
        doc.collection === collection &&
        Object.entries(where).every(([key, { equals }]) => doc.data[key] === equals),
      ).map(({ id, data }) => ({ id, ...data })),
    }),
    create: async (options) => {
      const doc = {
        ...options,
        data: { ...options.data, ...(options.file && { filename: options.file.name }) },
        id: created.length + 1000,
      };
      created.push(doc);
      return { id: doc.id, ...options.data };
    },
  };
  return { report, created, requests, failures, payload, lookup };
}

test("imports nested blocks, maps, images and PDF links with shared local IDs", async (t) => {
  const { payload, created, requests } = fixture(t);
  await importReport(payload, `${reportURL}/?ignored=true`);
  const report = created.find((doc) => doc.collection === "rapporter").data;
  const blocks = report.content.root.children;
  const result = blocks[0].fields;
  assert.equal(result.diskusjon.root.children[0].fields.media, report.bilde);
  const uploads = created.filter((doc) => doc.file);
  assert.equal(uploads.length, 4);
  assert.equal(requests.filter((url) => url.endsWith("/files/498.json")).length, 1);
  for (const upload of uploads) {
    assert.equal(upload.file.data.toString(), '{"data":true}');
    assert.equal(upload.context.disableRevalidate, true);
  }
  const mapFolder = created.find((doc) => doc.data.name === "kart").id;
  assert.equal(uploads.find((doc) => doc.id === result.kart).data.folder, mapFolder);
  const pdfID = result.diskusjon.root.children[1].fields.doc.value;
  assert.equal(uploads.find((doc) => doc.id === pdfID).file.name, "45.json");
  assert.equal(blocks[1].fields.url, "https://example.test/no/rapporter/bup");
  assert.equal(blocks[2].fields.url, "#om-atlaset");
  await importReport(payload, reportURL);
  assert.equal(created.filter((doc) => doc.collection === "rapporter").length, 1);
  assert.equal(created.filter((doc) => doc.file).length, 4);
});

test("fails explicitly on missing files and resumes without duplicating uploads", async (t) => {
  const { payload, created, failures } = fixture(t);
  failures.add("/files/18.json");
  await assert.rejects(importReport(payload, reportURL), /Could not download .*404/);
  assert.equal(created.filter((doc) => doc.collection === "rapporter").length, 0);
  failures.clear();
  await importReport(payload, reportURL);
  assert.equal(created.filter((doc) => doc.file).length, 4);
});

test("does not copy unknown relationship IDs into local rich text", async (t) => {
  const { report, payload, created } = fixture(t);
  report.content.root.children = [{
    type: "relationship", relationTo: "analyser", value: 55,
  }];
  await assert.rejects(importReport(payload, reportURL), /Unsupported rich-text relationship: analyser/);
  assert.equal(created.filter((doc) => doc.collection === "rapporter").length, 0);
});

test("rejects missing or ambiguous slug matches before writing locally", async (t) => {
  const { payload, lookup, created } = fixture(t);
  lookup.docs = [];
  lookup.totalDocs = 0;
  await assert.rejects(importReport(payload, reportURL), /Expected exactly one report .*found 0/);
  lookup.docs = [{}, {}];
  lookup.totalDocs = 2;
  await assert.rejects(importReport(payload, reportURL), /Expected exactly one report .*found 2/);
  assert.equal(created.length, 0);
});

test("rejects unsupported page URLs without fetching or writing", async (t) => {
  const { payload, requests, created } = fixture(t);
  await assert.rejects(
    importReport(payload, "https://example.test/no/analyser/barn2025"),
    /Expected a Norwegian report URL/,
  );
  assert.equal(requests.length, 0);
  assert.equal(created.length, 0);
});

test("rasterizes SVG images and reuses their PNG copies after an interrupted import", async (t) => {
  const { payload, created, failures } = fixture(t);
  const fetchFixture = globalThis.fetch;
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(input);
    if (url.pathname === "/api/media/498") {
      return Response.json({
        id: 498, filename: "figure.svg", url: "/files/figure.svg",
        mimeType: "image/svg+xml", alt: "Figure",
      });
    }
    if (url.pathname === "/files/figure.svg") {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" onload="init()">' +
        '<rect width="10" height="10" fill="red"/></svg>',
      );
    }
    return fetchFixture(input);
  });
  failures.add("/files/45.json");
  await assert.rejects(importReport(payload, reportURL), /Could not download .*404/);
  failures.clear();
  await importReport(payload, reportURL);
  const images = created.filter((doc) => doc.collection === "media");
  assert.equal(images.length, 1);
  assert.equal(images[0].file.name, "figure.svg.png");
  assert.equal(images[0].file.mimetype, "image/png");
  assert.equal(images[0].file.data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
});
