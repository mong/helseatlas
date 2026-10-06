import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { Analyser } from '../../../payload-types'

export const revalidateAnalyse: CollectionAfterChangeHook<Analyser> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published') {
      const path = `/[lang]/analyse/${doc.slug}`
      payload.logger.info(`Revalidating analyse at path: ${path}`)

      revalidatePath(path, "page")
      revalidatePath("/sitemap.xml")
    }

    // If the analyse was previously published, we need to revalidate the old path
    if (previousDoc._status === 'published' && doc._status !== 'published') {
      const oldPath = `/[lang]/analyse/${previousDoc.slug}`

      payload.logger.info(`Revalidating old analyse at path: ${oldPath}`)

      revalidatePath(oldPath, "page")
      revalidatePath("/sitemap.xml")
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Analyser> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    const path = `/[lang]/analyse/${doc?.slug}`

    revalidatePath(path, "page")
    revalidatePath("/sitemap.xml")
  }

  return doc
}
