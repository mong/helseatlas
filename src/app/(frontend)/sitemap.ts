import { Analyser, Rapporter } from "@/payload-types";
import { getAnalyser, getKompendier, getPages, getRapporter } from "@/services/payload";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const kompendier = await getKompendier({ lang: "no" });
  const analyser = await getAnalyser({ lang: "no" });

  const rapporter = await getRapporter({ lang: "no" });
  const rapporter_en = new Set((await getRapporter({ lang: "en", select: { slug: true } })).map(r => r.slug!));
  const pages = await getPages({ lang: "no" });
  const pages_en = new Set((await getPages({ lang: "en" })).map(page => page.slug!));

  const documents = (analyser as (Analyser | Rapporter)[]).concat(rapporter);

  return [
    {
      url: "https://analyser.skde.no",
      lastModified: analyser
        .map((analyse) => analyse.publishedAt || analyse.createdAt)
        .reduce(
          (acc, val) => (acc > new Date(val) ? acc : new Date(val)),
          new Date(0),
        ),
      alternates: {
        languages: {
          no: "https://analyser.skde.no/no",
          en: "https://analyser.skde.no/en",
        } as { no?: string; en?: string },
      },
    },
    {
      url: "https://analyser.skde.no/no/rapporter",
      lastModified: rapporter
        .map((rapport) => rapport.publishedAt || rapport.createdAt)
        .reduce(
          (acc, val) => (acc > new Date(val) ? acc : new Date(val)),
          new Date(0),
        ),
      alternates: {
        languages: {
          no: "https://analyser.skde.no/no/rapporter",
          en: "https://analyser.skde.no/en/rapporter",
        } as { no?: string; en?: string },
      },
    },
  ]
    .concat(
      kompendier.map((komp) => ({
        url: `https://analyser.skde.no/no/fag/${komp.identifier}`,
        lastModified: documents
          .filter((doc) =>
            doc.tags
              ?.filter((tag) => typeof tag === "object")
              .map((tag) => tag.identifier)
              .includes(komp.identifier),
          )
          .map((doc ) => doc.publishedAt || doc.createdAt)
          .reduce(
            (acc, val) => (acc > new Date(val) ? acc : new Date(val)),
            new Date(0),
          ),
        alternates: {
          languages: {
            en: `https://analyser.skde.no/en/fag/${komp.identifier}`,
            no: `https://analyser.skde.no/no/fag/${komp.identifier}`,
          },
        },
      })),
    )
    .concat(
      analyser.map((analyse) => ({
        url: `https://analyser.skde.no/no/analyse/${analyse.slug}`,
        lastModified: new Date(analyse.publishedAt || analyse.createdAt),
        alternates: {
          languages: {
            en: `https://analyser.skde.no/en/analyse/${analyse.slug}`,
            no: `https://analyser.skde.no/no/analyse/${analyse.slug}`,
          },
        },
      })),
    ).concat(
      rapporter.map((rapport) => ({
        url: `https://analyser.skde.no/no/rapporter/${rapport.slug}`,
        lastModified: new Date(rapport.publishedAt || rapport.createdAt),
        alternates: {
          languages: {
            no: `https://analyser.skde.no/no/rapporter/${rapport.slug}`,
            ...(rapporter_en.has(rapport.slug!) && { en: `https://analyser.skde.no/en/rapporter/${rapport.slug}` })
          },
        }
      })),
    ).concat(
      pages.map((page) => ({
        url: `https://analyser.skde.no/no/${page.slug}`,
        lastModified: new Date(page.publishedAt || page.createdAt),
        alternates: {
          languages: {
            no: `https://analyser.skde.no/no/${page.slug}`,
            ...(pages_en.has(page.slug!) && { en: `https://analyser.skde.no/en/${page.slug}` })
          },
        },
      })),
    );
}
