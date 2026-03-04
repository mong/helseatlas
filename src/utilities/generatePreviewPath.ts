import { PayloadRequest } from 'payload'

const collectionPrefixMap = {
  rapporter: (locale: string) =>
    `/${locale}/rapporter`,
  analyser: (locale: string) =>
    `/${locale}/analyse`,
  pages: () => '',
}

type Props = {
  collection: keyof typeof collectionPrefixMap
  slug: string
  req: PayloadRequest
  locale: string
}

export const generatePreviewPath = ({ collection, slug, locale }: Props) => {
  const encodedParams = new URLSearchParams({
    slug,
    collection,
    path: `${collectionPrefixMap[collection](locale)}/${slug}`,
    previewSecret: process.env.PREVIEW_SECRET || '',
  })

  const url = `/next/preview?${encodedParams.toString()}`

  return url
}
