import type { TableBlock as TableBlockProps } from "src/payload-types";

import React from "react";
import RichText from "@/components/RichText";


export const TableBlock: React.FC<TableBlockProps> = async ({
  table,
  caption
}) => {

  return (
    <figure className="mx-auto max-w-[80%]">
      <div className="leading-none [&_td]:p-2! [&_p]:m-0 text-base overflow-auto">
        <RichText
          data={table}
          enableGutter={false}
          enableProse={false}
        />
      </div>
      {caption && (
        <figcaption className={'mt-6'}>
          <RichText data={caption} enableGutter={false} />
        </figcaption>
      )}
    </figure>
  );
};
