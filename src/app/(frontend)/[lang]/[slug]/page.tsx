import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import { cache } from 'react'

import { LivePreviewListener } from '@/components/LivePreviewListener'

import { notFound } from 'next/navigation'
import { Lang } from '@/types'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { convertLexicalToPlaintext } from "@payloadcms/richtext-lexical/plaintext";

import {
  Header,
  Breadcrumbs,
  PageLayout,
  PageContent,
  HeroBanner,
} from "@mong/material-ui";

export const dynamic = 'force-static';
export const revalidate = 60;


export async function generateStaticParams() {
  if (process.env.NODE_ENV === 'development') return [];

  const payload = await getPayload({ config: configPromise })
  return (await Promise.all((["en", "no"] as Lang[]).map(async (lang) =>
    (await payload.find({
      collection: 'pages',
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
    slug: string
    lang: Lang
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode();

  const { slug = '', lang } = await paramsPromise;
  const page = await queryPageBySlug({ slug, lang });

  const payload = await getPayload({ config: configPromise });
  const otherLang = (await payload.find({
    collection: 'pages',
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

  if (!page) return notFound();

  const breadcrumbs = [
    {
      href: `/${lang}/${slug}`,
      name: page.title,
    },
  ];

  return (
    <>
      {draft && <LivePreviewListener />}
      <Header
        lang={lang}
        langChoices={otherLang ? [
          { code: 'no', url: `/no/${page.slug}` },
          { code: 'en', url: `/en/${page.slug}` },
        ] : undefined}
      />
      <Breadcrumbs
        explicitTrail={breadcrumbs}
      />

      <PageLayout>
        <HeroBanner
          description={convertLexicalToPlaintext({ data: page.description! })}
          image={typeof page.bilde === "object" && page.bilde?.url || "/background.jpeg"}
          title={page.title}
        />
        <PageContent>
          <article className="w-full">
            <RenderBlocks blocks={page.layout} />
          </article>
        </PageContent>
      </PageLayout>
    </>
  );
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '', lang } = await paramsPromise
  const rapport = await queryPageBySlug({ slug, lang })

  return {
    title: rapport?.meta?.title || rapport.title,
    description: rapport?.meta?.description || undefined,
  };
}

const queryPageBySlug = cache(async ({ slug, lang }: { slug: string, lang: Lang }) => {
  const { isEnabled: draft } = await draftMode();

  const payload = await getPayload({ config: configPromise });

  const result = await payload.find({
    collection: 'pages',
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
