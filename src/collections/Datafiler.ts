import type { CollectionConfig } from "payload";

import { anyone } from "../access/anyone";
import { authenticated } from "../access/authenticated";
import { revalidateTag } from "next/cache";

export const Datafiler: CollectionConfig = {
  slug: "datafiler",
  folders: true,
  labels: {
    singular: "Datafil",
    plural: "Datafiler",
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  hooks: {
    afterChange: [() => revalidateTag("datafil", "max")],
  },
  fields: [],
  upload: {
    disableLocalStorage: true,
  },
};
