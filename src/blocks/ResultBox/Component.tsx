import type { ResultBoxBlock as ResultBoxBlockProps } from "src/payload-types";

import React, { cache } from "react";
import RichText from "@/components/RichText";

import { ResultBox } from ".";

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

  const blobUrl= `${process.env.AZURE_STORAGE_ACCOUNT_BASEURL}${process.env.AZURE_STORAGE_CONTAINER_NAME}`

  // Promise.all to read both files concurrently
  const [mapData, data] = await Promise.all([
    getMap(`${blobUrl}/${kart.filename}`),
    fetch(`${blobUrl}/${media.filename}`, { cache: "force-cache", next: { tags: ["datafil"] } }).then((res) => res.json()),
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
