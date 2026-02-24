import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText, { headerNodeToPlaintext, sanitizeID } from '@/components/RichText'

import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Container } from '@mui/material'
import { SelectionProvider } from '@/lib/SelectionContext'
import { notFound } from 'next/navigation'
import { Lang } from '@/types'
import TagList from '@/components/TagList'
import { formatDateTime } from '@/utilities/formatDateTime'
import { BreadCrumbStop } from '@/components/Header/SkdeBreadcrumbs'
import { getDictionary } from '@/lib/dictionaries'
import Header from '@/components/Header'
import { TableOfContents } from '@/components/TableOfContents'
import { SerializedBlockNode, SerializedHeadingNode } from '@payloadcms/richtext-lexical'

import type { ResultBoxBlock as ResultBoxBlockProps } from 'src/payload-types'
import { makeDateElem } from '@/lib/helpers'

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

  if (!rapport) return notFound();

  const dict = await getDictionary(lang);

  const breadcrumbs: BreadCrumbStop[] = [
    {
      link: "https://www.skde.no",
      text: dict.general.homepage,
    },
    {
      link: `/${lang}`,
      text: dict.general.health_atlas,
    },
    {
      link: `/${lang}/rapporter`,
      text: dict.general.reports,
    },
    {
      link: `/${lang}/rapporter/${rapport.slug}`,
      text: rapport.title,
    },
  ];


  const headerData = rapport.content.root.children.filter(
    (child) => child.type === 'heading'
      || (child.type === 'block' && (child.fields as any)?.blockType === 'resultBox')
  ) as (SerializedBlockNode<ResultBoxBlockProps> | SerializedHeadingNode)[]

  const tocData = buildTocData(headerData);

  return (
    <>
      {draft && <LivePreviewListener />}
      <Header title={rapport.title} breadcrumbs={breadcrumbs} lang={otherLang ? lang : undefined}>
        <div className="flex flex-col md:flex-row gap-4 md:gap-16 mt-10">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm">Forfatter</p>
              <p className="m-0">{rapport.author}</p>
            </div>
          </div>
          {rapport.publishedAt && (
            <div className="flex flex-col gap-1">
              <p className="text-sm">Publisert</p>
              {makeDateElem(rapport.publishedAt, lang)}
            </div>
          )}
        </div>
      </Header>

      <Container maxWidth="xxl">
        <div className="flex flex-col lg:flex-row">
          {tocData.length > 0 && <TableOfContents tocData={tocData} />}
          <article className="shrink min-w-0 pb-8">
            <SelectionProvider>
              <RichText
                lang={lang === "en" ? "en" : rapport.norskType}
                author={rapport.author}
                data={rapport.content}
                enableGutter={true}
              />
            </SelectionProvider>
          </article>
        </div>
      </Container>
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
