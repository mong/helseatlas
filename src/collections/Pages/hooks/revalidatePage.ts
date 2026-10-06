import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { Page } from '../../../payload-types'

export const revalidatePage: CollectionAfterChangeHook<Page> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published') {
      const path = `/[lang]/${doc.slug}`
      payload.logger.info(`Revalidating page at path: ${path}`)

      revalidatePath(path, "page")
      revalidatePath("/sitemap.xml")
    }

    // If the page was previously published, we need to revalidate the old path
    if (previousDoc._status === 'published' && doc._status !== 'published') {
      const oldPath = `/[lang]/${previousDoc.slug}`

      payload.logger.info(`Revalidating old page at path: ${oldPath}`)

      revalidatePath(oldPath, "page")
      revalidatePath("/sitemap.xml")
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Page> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    const path = `/[lang]/${doc?.slug}`

    revalidatePath(path, "page")
    revalidatePath("/sitemap.xml")
  }

  return doc
}
