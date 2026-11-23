import type { ResultBoxBlock as ResultBoxBlockProps } from "@/payload-types";

import React, { cache } from "react";
import RichText from "@/components/RichText";

import { ResultBox } from ".";
import { getServerSideURL } from "@/utilities/getURL";
import { useAzureStorage } from "@/utilities/storageMode";

const getMap = cache(async (path: string) =>
  fetch(path, { cache: "force-cache", next: { tags: ["datafil"] } }).then((res) => res.json())
);


export const ResultBoxBlock: React.FC<ResultBoxBlockProps & { lang?: "en" | "nb" | "nn", author?: "SKDE" | "Helse Førde" }> = async ({
  kart,
  lang,
  author,
  oppsummering,
  diskusjon,
  utvalg,
  media,
  blockName,
}) => {

  if (!media || !(typeof media === "object") || !media.url || !media.filename)
    return;
  if (!kart || !(typeof kart === "object") || !kart.filename) return;

  // Builds must fetch directly from Azure without requiring a running Payload server.
  const azureURL = "https://payloadfiles.blob.core.windows.net/payloadcms";
  const mapURL = useAzureStorage
    ? `${azureURL}/${kart.filename}`
    : kart.url && new URL(kart.url, getServerSideURL()).href;
  if (!mapURL) return;
  const dataURL = useAzureStorage
    ? `${azureURL}/${media.filename}`
    : new URL(media.url, getServerSideURL()).href;

  // Promise.all to read both files concurrently
  const [mapData, data] = await Promise.all([
    getMap(mapURL),
    fetch(dataURL, { cache: "force-cache", next: { tags: ["datafil"] } }).then((res) => res.json()),
  ]);


  return (
    <ResultBox
      lang={lang || "nb"}
      author={author || "SKDE"}
      title={blockName || "Uten tittel"}
      boxData={data.innhold}
      mapData={mapData}
      summary={
        <RichText
          data={oppsummering}
          enableGutter={false}
          enableProse={false}
        />
      }
      discussion={
        <RichText data={diskusjon} enableGutter={false} enableProse={false} />
      }
      utvalg={
        <RichText data={utvalg} enableGutter={false} enableProse={false} />
      }
    />
  );
};
