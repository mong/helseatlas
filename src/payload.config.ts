import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { azureStorage } from "@payloadcms/storage-azure";

import { buildConfig } from "payload";
import { nb } from "@payloadcms/translations/languages/nb";
import { Media } from "./collections/Media";
import { Datafiler } from "./collections/Datafiler";
import { Users } from "./collections/Users";
import { Tags } from "./collections/Tags";
import { Rapporter } from "./collections/Rapporter";
import { Analyser } from "./collections/Analyser";
import { Pages } from "./collections/Pages";

import { getServerSideURL } from "./utilities/getURL";
import { useAzureStorage } from "./utilities/storageMode";


const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const isDevelopment = process.env.NODE_ENV === "development";
const hasAzureStorageConfig = Boolean(
  process.env.AZURE_STORAGE_ACCOUNT_BASEURL &&
  process.env.AZURE_STORAGE_CONNECTION_STRING &&
  process.env.AZURE_STORAGE_CONTAINER_NAME,
);
const postgresURI = process.env.POSTGRES_URI
  || (isDevelopment
    ? "postgres://postgres:postgres@localhost:5432/helseatlas"
    : "");

if (
  isDevelopment &&
  useAzureStorage &&
  process.env.PAYLOAD_GENERATE_TYPES !== "true" &&
  !hasAzureStorageConfig
) {
  throw new Error("Azure storage is enabled, but its configuration is incomplete.");
}

export default buildConfig({
  admin: {},
  editor: lexicalEditor(),
  collections: [Rapporter, Analyser, Pages, Users, Datafiler, Media, Tags],
  localization: {
    locales: ["en", "no"],
    defaultLocale: "no",
  },
  serverURL: getServerSideURL(),
  i18n: {
    supportedLanguages: { nb },
  },
  // Your Payload secret - should be a complex and secure string, unguessable
  secret: process.env.PAYLOAD_SECRET || "",
  indexSortableFields: true,
  db: postgresAdapter({
    pool: {
      connectionString: postgresURI,
    },
  }),
  sharp, // <- If you want to resize images, crop, set focal point, etc.
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  plugins: useAzureStorage
    ? [
        azureStorage({
          collections: {
            media: true,
            datafiler: true,
          },
          allowContainerCreate: false,
          baseURL: process.env.AZURE_STORAGE_ACCOUNT_BASEURL || "",
          connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || "",
          containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || "",
        }),
      ]
    : [],
});
