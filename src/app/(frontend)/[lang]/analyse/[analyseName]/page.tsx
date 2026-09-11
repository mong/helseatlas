import { cache, Suspense } from "react";
import {
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";
import { Lang } from "@/types";
import { ChartContainer } from "@/components/Charts/ChartContainer";
import { getDictionary } from "@/lib/dictionaries";
import { getSubHeader, makeDateElem } from "@/lib/helpers";
import TagList from "@/components/TagList";
import { notFound } from "next/navigation";
import { Compare } from "@/components/Compare";
import { draftMode } from "next/headers";
import { getPayload } from "payload";
import configPromise from "@payload-config";
import { LivePreviewListener } from "@/components/LivePreviewListener";
import RichText from "@/components/RichText";
import { MaxWidth } from "@/components/MaxWidth"
import { Accordion, AccordionItem } from "@mong/material-ui";

import {
  Header,
  Breadcrumbs,
  PageLayout,
  PageContent,
} from "@mong/material-ui";

import { createHash } from "crypto";


export const dynamic = 'force-static';
export const revalidate = 60;

export async function generateStaticParams() {
  if (process.env.NODE_ENV === 'development') return [];

  const payload = await getPayload({ config: configPromise })
  const result = (await Promise.all((["en", "no"] as Lang[]).map(async (lang) =>
    (await payload.find({
      collection: 'analyser',
      draft: false,
      limit: 0,
      locale: lang,
      fallbackLocale: false,
      overrideAccess: false,
      pagination: false,
      where: {
        publiseringsStatus: { not_equals: "hidden" }
      },
      select: {
        slug: true,
      },
    })).docs.map(({ slug }) => ({ analyseName: slug, lang }))
  ))).flat();

  return result;
}



export const generateMetadata = async (props: {
  params: Promise<{ lang: Lang; analyseName: string; }>;
}) => {
  const { lang, analyseName } = await props.params;

  const analyse = await queryAnalyseBySlug({ slug: analyseName, lang });

  if (!analyse) notFound();

  const tags =
    analyse.tags?.filter((tag) => typeof tag === "object" && tag !== null) ||
    [];

  const dict = await getDictionary(lang);

  return {
    title: `${analyse.title} - ${dict.general.health_atlas}`,
    description: `${dict.general.health_atlas}`,
    keywords: `${tags
      .map((tag) => tag.title)
      .join(", ")}, ${dict.general.metadata_keywords}`,
  };
};

export default async function AnalysePage(props: {
  params: Promise<{ lang: Lang; analyseName: string; }>;
}) {
  const { lang, analyseName } = await props.params;
  const { isEnabled: draft } = await draftMode();

  const analyse = await queryAnalyseBySlug({ slug: analyseName, lang });

  if (!analyse || analyse.publiseringsStatus === "hidden" || !["en", "no"].includes(lang)) {
    notFound();
  }


  const oldAnalyse = draft && analyse._status === "draft"
    ? (await queryAnalyseBySlug({ slug: analyseName, lang, disableDraft: true }))
    : false;

  const dataHash = createHash("md5")
    .update(JSON.stringify(analyse.data || ""))
    .digest("hex");

  const oldDataHash = createHash("md5")
    .update(JSON.stringify(oldAnalyse && oldAnalyse.data || ""))
    .digest("hex");

  const nynorsk = lang === "no" && analyse.norskType === "nn";
  const dict = await getDictionary(nynorsk ? "nn" : lang);

  const breadcrumbs = [
    {
      href: lang === "en" ? "/en" : "/",
      name: dict.general.health_atlas,
    },
    {
      href: `/${lang}/analyse/${analyse.slug}`,
      name: analyse.title,
    },
  ];

  return (
    <>
      <Header
        lang={lang}
        langChoices={[
          { code: 'no', url: `/no/analyse/${analyse.slug}` },
          { code: 'en', url: `/en/analyse/${analyse.slug}` },
        ]}
      />
      <Breadcrumbs
        explicitTrail={breadcrumbs}
      />
      {draft && <LivePreviewListener />}
      <PageLayout>
        <div className="bg-white py-8">
          <PageContent color="white">
            {analyse.publiseringsStatus === "test" && (
              <MaxWidth size="medium">
                <Alert severity="warning" className="mt-4">
                  Dette er en test-side! Denne analysen er fortsatt ikke publisert.
                </Alert>
                <Paper
                  elevation={0}
                  sx={{
                    marginTop: 2,
                    padding: 2,
                    paddingY: 4,
                    boxShadow: "inset 0 0 25px #003087",
                    background: "#F9F9F9",
                  }}
                >
                  <Compare
                    newAnalyse={analyse.data}
                    different={oldDataHash !== dataHash}
                    oldAnalyse={oldAnalyse && oldAnalyse.data}
                  />
                </Paper>
              </MaxWidth>
            )}
            <MaxWidth size="small">
              <h1 className="my-4">
                {analyse.title}
              </h1>
              <h5 className="my-8">
                {getSubHeader(analyse.data, lang)}
              </h5>
              {analyse.tags && (
                <TagList
                  tags={analyse.tags.filter(
                    (tag) => typeof tag === "object" && tag !== null,
                  )}
                  lang={lang}
                />
              )}

              <div className="prose max-w-none prose-li:marker:text-black prose-li:my-0 text-large">
                <RichText data={analyse.summary} enableGutter={true} />
              </div>
              <div className="flex gap-x-12 gap-y-4 flex-wrap text-small">
                <span>{dict.general.by}: {analyse.author}</span>
                <span>
                  {dict.general.updated}{" "}
                  {makeDateElem(analyse.publishedAt || analyse.createdAt, lang)}
                </span>
              </div>
            </MaxWidth>
          </PageContent>
        </div>
        <PageContent>
          <Suspense
            fallback={
              <div className="my-32 justify-center flex">
                <CircularProgress />
              </div>
            }
          >
            <div className="py-8">
              {analyse.data?.name && analyse.data.name === analyse.slug ? (
                <MaxWidth size="medium">
                  <ChartContainer
                    key={dataHash} // Providing key to update state when new files are uploaded in preview
                    analyse={analyse}
                    lang={lang}
                    dict={dict}
                    nynorsk={nynorsk}
                  />
                </MaxWidth>
              ) : (
                <Alert severity="error">
                  {analyse.data?.name !== analyse.slug
                    ? "Feil navn i JSON-fila (må være identisk med 'slug')"
                    : "JSON-fil mangler eller inneholder feil"}
                </Alert>
              )}
              <MaxWidth size="small">
                <h3 className="mt-8">
                  {dict.analysebox.discussion}
                </h3>
                <div className="prose max-w-none prose-li:marker:text-black prose-li:my-0">
                  <RichText data={analyse.discussion} enableGutter={true} />
                </div>
                <Accordion
                  gap="2"
                  keyId="om-analysen"
                  type="collapseOthers"
                  variant="text"
                >
                  <AccordionItem title={dict.analysebox.info}>
                    <div className="prose max-w-none prose-li:marker:text-black prose-li:my-0">
                      <RichText data={analyse.about} enableGutter={true} />
                    </div>
                  </AccordionItem>
                </Accordion>
              </MaxWidth>
            </div>
          </Suspense>
        </PageContent>
      </PageLayout>
    </>
  );
}

const queryAnalyseBySlug = cache(
  async ({ slug, lang, disableDraft = false }: { slug: string; lang: Lang, disableDraft?: boolean }) => {
    const { isEnabled: draft } = await draftMode();

    const payload = await getPayload({ config: configPromise });

    const result = await payload.find({
      collection: "analyser",
      draft: draft && !disableDraft,
      limit: 1,
      overrideAccess: draft,
      pagination: false,
      locale: lang,
      fallbackLocale: false,
      where: {
        slug: {
          equals: slug,
        },
      },
    });

    return result.docs?.[0] || null;
  },
);
