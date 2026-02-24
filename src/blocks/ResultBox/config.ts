import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
  UploadFeature,
  BlocksFeature,
} from '@payloadcms/richtext-lexical'
import { MediaBlock } from '../MediaBlock/config'
import { Table } from '../Table/config'
export const ResultBox: Block = {
  slug: 'resultBox',
  fields: [
    {
      name: 'media',
      required: true,
      label: "JSON",
      type: "relationship",
      relationTo: 'datafiler',
      filterOptions: async ({ data, req }) => {

        const media = await req.payload.find({
          collection: "datafiler",
          where: {
            and: [
              { mimeType: { equals: "application/json" } },
              { folder: { exists: true } },
              { folder: { equals: data.folder } }
            ]
          },
          pagination: false,
          depth: 0,
          select: {},
        })
        return {
          id: { in: media.docs.map(d => d.id) }
        }
      },
    },
    {
      name: 'kart',
      required: true,
      label: "Kart",
      type: "relationship",
      relationTo: 'datafiler',
      filterOptions: async ({ data, req }) => {
        const mapfiles = await req.payload.find({
          collection: "datafiler",
          where: {
            and: [
              { folder: { exists: true } },
              { 'folder.name': { equals: "kart" } },
              { mimeType: { in: ["application/geo+json", "application/octet-stream"] } }
            ]
          },
          pagination: false,
          depth: 0,
          select: { filename: true },
        })
        return {
          id: { in: mapfiles.docs.filter(d => d.filename?.endsWith(".geojson")).map(d => d.id) }
        }
      },
      defaultValue: async ({ req }) => {
        const kart = await req.payload.find({
          collection: "datafiler",
          where: {
            and: [
              { 'folder.name': { equals: "kart" } },
              { filename: { equals: "kart_2024.geojson" } }
            ],
          },
          pagination: false,
          limit: 1,
          select: {}
        })
        return kart?.docs?.[0]?.id
      },
    },
    {
      name: 'oppsummering',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, InlineToolbarFeature()]
        },
      }),
      required: true,
    },
    {
      name: 'diskusjon',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            FixedToolbarFeature(),
            UploadFeature(),
            InlineToolbarFeature(),
            BlocksFeature({ blocks: [MediaBlock, Table] }),
          ]
        },
      }),
      label: "Diskusjon",
      required: true,
    },
    {
      name: 'utvalg',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            InlineToolbarFeature(),
            BlocksFeature({ blocks: [MediaBlock, Table] }),
          ]
        },
      }),
      label: "Utvalg",
      required: true,
    },
  ],
  interfaceName: 'ResultBoxBlock',
}
