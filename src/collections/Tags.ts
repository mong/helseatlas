import type { CollectionConfig } from "payload";

import { anyone } from "../access/anyone";
import { authenticated } from "../access/authenticated";
import { lexicalEditor } from "@payloadcms/richtext-lexical";

export const Tags: CollectionConfig = {
  slug: "tags",
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: "title",
  },
  fields: [
    {
      name: "title",
      type: "text",
      localized: true,
      required: true,
    },
    {
      name: "identifier",
      label: "ID",
      admin: {
        description: "Unik ID for taggen.",
      },
      type: "text",
      required: true,
      unique: true,
      hooks: {
        beforeValidate: [
          ({ value }) =>
            typeof value === "string"
              ? value
                  ?.replace(/ /g, "-")
                  .replace(/[^\w-]+/g, "")
                  .toLowerCase()
              : value,
        ],
      },
    },
    {
      name: "description",
      type: "richText",
      localized: true,
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures.filter(
              (f) => !["upload", "relationship"].includes(f.key),
            ),
          ];
        },
      }),
    },
    {
      name: "taggedRapporter",
      label: "Rapporter med denne taggen",
      type: "join",
      collection: "rapporter",
      on: "tags",
    },
    {
      name: "taggedAnalyser",
      label: "Analyser med denne taggen",
      type: "join",
      collection: "analyser",
      on: "tags",
    },
  ],
};
