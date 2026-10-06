import { Lang } from "@/types";
import { getPayload } from "payload";
import { cache } from "react";
import config from "@payload-config";
import { Analyser, Page, Rapporter, Tag } from "@/payload-types";

export const getTag = cache(
  async ({ identifier, lang }: { identifier: string; lang: Lang }) => {
    const payload = await getPayload({ config: config });

    const result = await payload.find({
      collection: "tags",
      limit: 1,
      locale: lang,
      pagination: false,
      where: {
        identifier: {
          equals: identifier,
        },
      },
      fallbackLocale: false,
    });

    return (result.docs?.[0] as Tag) || null;
  },
);

export const getKompendier = cache(async ({ lang }: { lang: Lang }) => {
  const payload = await getPayload({ config: config });

  const result = await payload.find({
    collection: "tags",
    limit: 0,
    locale: lang,
    pagination: false,
    sort: "title",
  });

  return result.docs as Tag[];
});

export const getAnalyser = cache(async (
  { lang, select }:
  { lang: Lang;
    select?: { [k in keyof Analyser]?: true }
  }) => {

  const payload = await getPayload({ config: config });

  const result = await payload.find({
    collection: "analyser",
    limit: 0,
    locale: lang,
    pagination: false,
    fallbackLocale: false,
    sort: "title",
    where: {
      publiseringsStatus: { equals: "published" },
    },
    select,
  });

  return result.docs as Analyser[];
});

export const getAnalyserByTag = cache(
  async ({ identifier, lang, select }: { identifier: string; lang: Lang; select?: { [k in keyof Analyser]?: true } }) => {

    const payload = await getPayload({ config: config });

    const tag = await getTag({ identifier, lang });

    const result = await payload.find({
      collection: "analyser",
      limit: 0,
      locale: lang,
      pagination: false,
      fallbackLocale: false,
      sort: "title",
      depth: 0,
      where: {
        tags: { contains: tag.id },
        publiseringsStatus: { equals: "published" },
      },
      select,
    });

    return result.docs as Analyser[];
  },
);

export const getRapporterByTag = cache(
  async ({ identifier, lang, select, sort="title" }: { identifier: string; lang: Lang; select?: { [k in keyof Rapporter]?: true }; sort?: string }) => {
    const payload = await getPayload({ config: config });

    const tag = await getTag({ identifier, lang });

    const result = await payload.find({
      collection: "rapporter",
      limit: 0,
      locale: lang,
      pagination: false,
      fallbackLocale: false,
      sort,
      depth: 1,
      where: {
        tags: { contains: tag.id },
        publiseringsStatus: { equals: "published" },
      },
      select,
    });

    return result.docs as Rapporter[];
  },
);

export const getRapporter = cache(async (
  { lang, select }:
  { lang: Lang;
    select?: { [k in keyof Rapporter]?: true }
  }) => {

  const payload = await getPayload({ config: config });

  const result = await payload.find({
    collection: "rapporter",
    limit: 0,
    locale: lang,
    pagination: false,
    fallbackLocale: false,
    where: {
      publiseringsStatus: { equals: "published" },
    },
    select,
  });

  return result.docs as Rapporter[];
});

export const getPages = cache(async ({ lang }: { lang: Lang }) => {
  const payload = await getPayload({ config });

  const result = await payload.find({
    collection: "pages",
    limit: 0,
    locale: lang,
    pagination: false,
    fallbackLocale: false,
    where: {
      publiseringsStatus: { equals: "published" },
    },
  });

  return result.docs as Page[];
});
