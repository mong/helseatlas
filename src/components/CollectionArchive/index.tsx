import React from 'react'
import { Lang } from '@/types'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cn } from '@/utilities/ui'
import { Media } from '../Media'
import { makeDateElem } from '@/lib/helpers'

export type Props = {
  lang: Lang
}

export const CollectionArchive: React.FC<Props> = async (props) => {
  const { lang } = props

  const payload = await getPayload({ config: configPromise });

  const rapporter = await payload.find({
    collection: 'rapporter',
    depth: 1,
    limit: 0,
    where: {
      publiseringsStatus: { equals: "published" }
    },
    pagination: false,
    locale: lang,
    overrideAccess: false,
    select: {
      title: true,
      publishedAt: true,
      createdAt: true,
      slug: true,
      tags: true,
      bilde: true,
    },
  });

  return (
    <div className="my-8">
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-10">
        {rapporter.docs?.filter(doc => typeof doc === 'object' && doc !== null).map((doc, index) => {
          const href = `/${lang}/rapporter/${doc.slug}`;
          return (
            <div className="col-span-4" key={index}>
              <a href={href} className="no-underline hover:[&_h3]:underline text-inherit">
                <article
                  className={cn(
                    'rounded-3xl overflow-hidden hover:cursor-pointer',
                    'hover:shadow-lg transition-shadow duration-100 bg-[#e3f3ef] hover:[&_picture]:opacity-[0.8]',
                    'h-full',
                  )}
                >
                  <div className="max-h-[350px] overflow-hidden">
                    {!doc.bilde && <div className="">No image</div>}
                    {doc.bilde && typeof doc.bilde !== 'string' && <Media loading={index < 2 ? 'eager' : 'lazy'} resource={doc.bilde} size="33vw" />}
                  </div>
                  <div className="py-5 px-6">
                    <span className="text-base">
                      <span className="mr-1">●</span>
                      {lang === "en" ? "Published: " : "Publisert: "}
                      <strong>{makeDateElem(doc.publishedAt!, lang)}</strong>
                    </span>
                    <div>
                      {doc.title && <h3>{doc.title}</h3>}
                    </div>
                  </div>
                </article>
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
