
import { Lang } from "@/types";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/dictionaries";

import { formatDate, getSubHeader, isNewRapport } from "@/lib/helpers";
import { MaxWidth } from "@/components/MaxWidth"

import {
  Header,
  Breadcrumbs,
  PageLayout,
  PageContent,
  AnalysisCard,
  ReportCard,
  Box
} from "@mong/material-ui";

import { convertLexicalToPlaintext } from "@payloadcms/richtext-lexical/plaintext";

import { getAnalyserByTag, getTag, getRapporterByTag } from "@/services/payload";
import { getPayload } from "payload";
import configPromise from "@payload-config";
import { Analyser } from "@/payload-types";


export const dynamic = 'force-static';
export const revalidate = 60;

export async function generateStaticParams() {
  if (process.env.NODE_ENV === 'development') return [];

  const payload = await getPayload({ config: configPromise })
  const result = (await Promise.all((["en", "no"] as Lang[]).map(async (lang) =>
    (await payload.find({
      collection: 'tags',
      draft: false,
      limit: 0,
      locale: lang,
      fallbackLocale: false,
      overrideAccess: false,
      pagination: false,
      select: {
        identifier: true,
      },
    })).docs.map(({ identifier }) => ({ kompendium: identifier, lang }))
  ))).flat();
  return result;
}

const getSummary = (analyse: Analyser) => {
  const firstBulletPoint = (analyse.summary.root.children[0] as any)?.children[0]?.children[0]?.text;
  return firstBulletPoint ? firstBulletPoint + "." : "";
};

export const generateMetadata = async (props: {
  params: Promise<{ lang: Lang; kompendium: string }>;
}) => {
  const { kompendium, lang } = await props.params;
  const tag = await getTag({ identifier: kompendium, lang });

  if (!tag || !["en", "no"].includes(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);

  return {
    title: `${tag.title} - ${dict.general.health_atlas}`,
    description: tag.description
      ? convertLexicalToPlaintext({ data: tag.description })
      : `${dict.general.health_atlas}: ${tag.title}`,
    keywords: `${tag.title}, ${dict.general.metadata_keywords}`,
  };
};

export default async function KompendiumPage(props: {
  params: Promise<{ lang: Lang; kompendium: string }>;
}) {
  const { kompendium, lang } = await props.params;

  const tag = await getTag({ identifier: kompendium, lang });

  if (!tag || !["en", "no"].includes(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);

  const analyser = await getAnalyserByTag({
    identifier: kompendium,
    lang,
  });

  const rapporter = await getRapporterByTag({
    identifier: kompendium,
    lang,
    select: {
      title: true,
      publishedAt: true,
      createdAt: true,
      slug: true,
      tags: true,
      bilde: true,
      author: true,
      summary: true,
    },
    sort: "-publishedAt",
  });
  const newRapporter = rapporter.filter(isNewRapport);

  const breadcrumbs = [
    {
      href: lang === "en" ? "/en" : "/",
      name: dict.general.health_atlas,
    },
    {
      href: `/${lang}/fag/${kompendium}`,
      name: tag.title,
    },
  ];

  return (
    <>
      <Header
        lang={lang}
        langChoices={[
          { code: 'no', url: `/no/fag/${tag.identifier}` },
          { code: 'en', url: `/en/fag/${tag.identifier}` },
        ]}
      />
      <Breadcrumbs
        pathname={"/"}
        leading={breadcrumbs}
      />
      <PageLayout>
        <div className="bg-white py-4 md:py-8">
          <PageContent color="white">
            <MaxWidth size="x-small">
              <div className="text-center">
                <h1>{tag.title}</h1>
                <br />
                {/* Fjerner midlertidig description i en overgangsfase */}
                {/* <div className="prose max-w-none prose-li:marker:text-black prose-li:my-0">
                  <RichText data={tag.description!} enableGutter={true} />
                </div> */}
              </div>
            </MaxWidth>
            <MaxWidth size="large">
              {newRapporter.length > 0 && (
                <div className="grid grid-cols-1 md:auto-rows-[minmax(320px,auto)] gap-8 py-8">
                  {newRapporter.map((rapport, i) => (
                    <ReportCard
                      key={i}
                      author={`${dict.general.by}: ${rapport.author}`}
                      buttonLabel={dict.general.read_report}
                      description={rapport.summary}
                      imageUrl={typeof rapport.bilde === "object" && rapport.bilde?.sizes?.small?.url || ""}
                      isNew
                      isPromo
                      // @ts-expect-error: Type mismatch
                      targetGroup={undefined}
                      targetUrl={`/${lang}/rapporter/${rapport.slug}`}
                      title={rapport.title}
                      updated={formatDate(rapport.publishedAt || rapport.createdAt, lang)}
                    />
                  ))}
                </div>)}
            </MaxWidth>
          </PageContent>
        </div>
        {analyser.length > 0 && (
          <PageContent>
            <MaxWidth size="large">
              <div className="py-8 md:py-16">
                <h2 className="pb-8">{dict.general.analyser}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {analyser.map(async (analyse, i) => (
                    <AnalysisCard
                      key={i}
                      author={`${dict.general.by}: ${analyse.author}`}
                      buttonLabel={dict.general.read_analysis}
                      description={getSummary(analyse)}
                      targetGroup={getSubHeader(analyse.data, lang)}
                      targetUrl={`/${lang}/analyse/${analyse.slug}`}
                      title={analyse.title}
                      updated={formatDate(analyse.publishedAt || analyse.createdAt, lang)}
                    />))}
                </div>
              </div>
            </MaxWidth>
          </PageContent>
        )}
        {rapporter.length > 0 && (
          <div className="bg-white">
            <PageContent color="white">
              <MaxWidth size="large">
                <div className="py-8 md:py-16">
                  <h2 className="pb-8">{dict.general.rapporter}</h2>
                  <div className="grid grid-cols-1 gap-8 md:auto-rows-[minmax(320px,auto)]">
                    {rapporter.map((rapport, i) => (
                      <ReportCard
                        key={i}
                        author={`${dict.general.by}: ${rapport.author}`}
                        buttonLabel={dict.general.read_report}
                        description={rapport.summary}
                        imageUrl={typeof rapport.bilde === "object" && rapport.bilde?.sizes?.small?.url || ""}
                        isNew={false}
                        // @ts-expect-error: Type mismatch
                        targetGroup={undefined}
                        targetUrl={`/${lang}/rapporter/${rapport.slug}`}
                        title={rapport.title}
                        updated={formatDate(rapport.publishedAt || rapport.createdAt, lang)}
                      />
                    ))}
                  </div>
                </div>
              </MaxWidth>
            </PageContent>
          </div>
        )}
      </PageLayout >
    </>
  );
}
