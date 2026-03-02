import type { CollectionConfig } from "payload";

import { authenticated } from "../../access/authenticated";

export async function loginCredentials(headers: Headers) {
  /*
  More or less a copy of{ loginCredentials } from "@/lib/authorization"; (the import "server-only" makes Payload crash)
  */
  if (process.env.NODE_ENV === "development") {
    return { userName: "Example user", email: "example@example.test" };
  }

  const email = headers.get("x-ms-client-principal-name");
  const authInfo = headers.get("x-ms-client-principal");

  if (!(email && authInfo)) {
    return false;
  }

  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(authInfo, "base64").toString());
  } catch (_) {
    return false;
  }

  const userName: string = (parsed.claims as Array<any>).find(
    (claim) => claim.typ === "name",
  ).val;

  return { userName, email };
}

export const Users: CollectionConfig = {
  slug: "users",
  access: {
    admin: authenticated,
    create: () => false,
    delete: () => false,
    read: authenticated,
    update: () => false,
  },
  admin: {
    defaultColumns: ["name", "email"],
    useAsTitle: "name",
    enableRichTextLink: false,
  },
  auth: {
    disableLocalStrategy: true,
    strategies: [
      {
        name: "entra-id-strategy",
        authenticate: async ({ payload, headers }) => {
          const credentials = await loginCredentials(headers);
          if (!credentials) {
            return { user: null };
          }

          const usersQuery = await payload.find({
            collection: "users",
            where: {
              email: {
                equals: credentials.email,
              },
            },
          });

          if (!usersQuery.docs[0]) {
            const user = await payload.create({
              collection: "users",
              data: {
                name: credentials.userName,
                email: credentials.email,
              },
            });
            return { user };
          }

          return {
            user: usersQuery.docs[0] || null,
          };
        },
      },
    ],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "email",
      type: "email",
      unique: true,
      required: true,
    },
  ],
  timestamps: true,
};
