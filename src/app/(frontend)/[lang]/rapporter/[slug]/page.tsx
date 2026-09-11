import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import { cache } from 'react'
import RichText, { headerNodeToPlaintext } from '@/components/RichText'

import { LivePreviewListener } from '@/components/LivePreviewListener'
import { SelectionProvider } from '@/lib/SelectionContext'
import { notFound } from 'next/navigation'
import { Lang } from '@/types'

import { getDictionary } from '@/lib/dictionaries'
import { TableOfContents } from '@/components/TableOfContents'
import { SerializedBlockNode, SerializedHeadingNode } from '@payloadcms/richtext-lexical'
import { MaxWidth } from "@/components/MaxWidth";

import {
  Header,
  Breadcrumbs,
  PageLayout,
  PageContent,
} from "@mong/material-ui";

import type { ResultBoxBlock as ResultBoxBlockProps } from '@/payload-types'
import { makeDateElem } from '@/lib/helpers'




export const dynamic = 'force-static';
export const revalidate = 60;

const buildTocData = (content: (SerializedBlockNode<ResultBoxBlockProps> | SerializedHeadingNode)[], level: number = 1): any => {
  const [first, ...rest] = content;

  if (!first) return [];

  if (first.type === "block") {
    return [
      {
        level,
        elemID: first.fields.blockName,
        children: []
      },
      ...buildTocData(rest, level)
    ];
  }
  else if (level > 1 || first.tag !== "h2") return buildTocData(rest, level); // Skip headings that are not top-level
  else {
    const childrenUntil = rest.findIndex(item => item.type === "heading" && item.tag <= first.tag);
    return [
      {
        level: first.tag,
        elemID: headerNodeToPlaintext(first),
        children: buildTocData(rest.slice(0, childrenUntil), level + 1)
      },
      ...buildTocData(rest.slice(childrenUntil), level)
    ];
  }
}


export async function generateStaticParams() {
  if (process.env.NODE_ENV === 'development') return [];

  const payload = await getPayload({ config: configPromise })
  return (await Promise.all((["en", "no"] as Lang[]).map(async (lang) =>
    (await payload.find({
      collection: 'rapporter',
      draft: false,
      limit: 0,
      locale: lang,
      fallbackLocale: false,
      overrideAccess: false,
      pagination: false,
      where: {
        publiseringsStatus: { equals: "published" }
      },
      select: {
        slug: true,
      },
    })).docs.map(({ slug }) => ({ slug, lang }))
  ))).flat();
}

type Args = {
  params: Promise<{
    slug?: string
    lang: Lang
  }>
}

export default async function Rapport({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode();



  const { slug = '', lang } = await paramsPromise;
  const rapport = await queryRapportBySlug({ slug, lang });

  const payload = await getPayload({ config: configPromise });
  const otherLang = (await payload.find({
    collection: 'rapporter',
    depth: 1,
    limit: 1,
    where: {
      slug: { equals: slug },
      publiseringsStatus: { equals: "published" }
    },
    pagination: false,
    locale: lang === 'en' ? 'no' : 'en',
    overrideAccess: false,
    select: {},
  })).docs.length > 0;

  if (!rapport || rapport.publiseringsStatus === "hidden") return notFound();

  const dict = await getDictionary(lang);

  const breadcrumbs = [
    {
      href: lang === "en" ? "/en" : "/",
      name: dict.general.health_atlas,
    },
    {
      href: `/${lang}/rapporter/${rapport.slug}`,
      name: rapport.title,
    },
  ];


  const headerData = rapport.content?.root.children.filter(
    (child) => child.type === 'heading'
      || (child.type === 'block' && (child.fields as any)?.blockType === 'resultBox')
  ) as (SerializedBlockNode<ResultBoxBlockProps> | SerializedHeadingNode)[] || [];

  const tocData = buildTocData(headerData);

  return (
    <>
      {draft && <LivePreviewListener />}

      <Header
        lang={lang}
        langChoices={otherLang ? [
          { code: 'no', url: `/no/rapporter/${rapport.slug}` },
          { code: 'en', url: `/en/rapporter/${rapport.slug}` },
        ] : undefined}
      />
      <Breadcrumbs
        explicitTrail={breadcrumbs}
      />
      <PageLayout>
        <div className="bg-white py-8">
          <PageContent color="white">
            <MaxWidth size="small">
              <h1 className="my-4">{rapport.title}</h1>
              <div className="flex gap-x-12 gap-y-4 flex-wrap text-small">
                <span>{dict.general.by}: {rapport.author}</span>
                <span>
                  {dict.general.published}{" "}
                  {makeDateElem(rapport.publishedAt || rapport.createdAt, lang)}
                </span>
              </div>
            </MaxWidth>
          </PageContent>
        </div>
        <PageContent>
          <MaxWidth size="large">
          <div className="flex flex-col lg:flex-row">
            {tocData.length > 0 && <TableOfContents tocData={tocData} />}
            <article className="shrink min-w-0 pb-8 lg:pt-8">
              <SelectionProvider>
                <div className="prose max-w-none prose-li:marker:text-black">
                  <RichText
                    lang={lang === "en" ? "en" : rapport.norskType}
                    author={rapport.author}
                    data={rapport.content}
                    enableGutter={true}
                  />
                </div>
              </SelectionProvider>
            </article>
          </div>
          </MaxWidth>
        </PageContent>
      </PageLayout>
    </>
  );
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '', lang } = await paramsPromise
  const rapport = await queryRapportBySlug({ slug, lang })
  const dict = await getDictionary(lang);

  return {
    title: `${rapport.title} - ${dict.general.health_atlas}`,
  };
}

const queryRapportBySlug = cache(async ({ slug, lang }: { slug: string, lang: Lang }) => {
  const { isEnabled: draft } = await draftMode();

  const payload = await getPayload({ config: configPromise });

  const result = await payload.find({
    collection: 'rapporter',
    draft,
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
})
