import "server-only";
import { headers } from "next/headers";

export async function loginCredentials() {
  if (process.env.NODE_ENV === "development") {
    return { userName: "Example user", email: "example@example.test" };
  }

  const headerList = await headers();
  const email = headerList.get("x-ms-client-principal-name");
  const authInfo = headerList.get("x-ms-client-principal");

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
