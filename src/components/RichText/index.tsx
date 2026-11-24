import { ResultBoxBlock } from "@/blocks/ResultBox/Component";
import { FactBoxBlock } from "@/blocks/FactBox/Component";
import { TableBlock } from "@/blocks/Table/Component";
import { MediaBlock } from '@/blocks/MediaBlock/Component';
import { RawHTMLBlock } from "@/blocks/RawHTML/Component";

import type {
  ResultBoxBlock as ResultBoxBlockProps,
  FactBoxBlock as FactBoxBlockProps,
  MediaBlock as MediaBlockProps,
  TableBlock as TableBlockProps,
  RawHTMLBlock as RawHTMLBlockProps
} from '@/payload-types'
import {
  DefaultNodeTypes,
  SerializedBlockNode,
  SerializedHeadingNode,
  SerializedLinkNode,
  type DefaultTypedEditorState,
} from "@payloadcms/richtext-lexical";
import {
  JSXConvertersFunction,
  LinkJSXConverter,
  RichText as ConvertRichText,
} from "@payloadcms/richtext-lexical/react";
import { convertLexicalToPlaintext } from "@payloadcms/richtext-lexical/plaintext";
import { Suspense } from "react";
import { CircularProgress } from "@mui/material";

type NodeTypes = DefaultNodeTypes | SerializedBlockNode;

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const { value, relationTo } = linkNode.fields.doc!;
  if (typeof value !== "object") {
    throw new Error("Expected value to be an object");
  }

  switch (relationTo) {
    case "media":
    case "datafiler":
      return value.url as string;
    default:
      return `/${value.slug}`;
  }

};

const findParentHeading = (nodes: any, startingHeader: `h${number}`, startIndex: number) => {
  if (["h1", "h2"].includes(startingHeader)) return null;
  for (let i = startIndex; i >= 0; i--) {
    const node = nodes[i];
    if (node.type === "heading" && node.tag === "h2") {
      return node;
    }
  }
  return null;
}

export const sanitizeID: (heading: string) => string = (heading) =>
  heading.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export const headerNodeToPlaintext: (node: SerializedHeadingNode) => string = (node) =>
  convertLexicalToPlaintext({
    data: {
      root: {
        children: node.children,
        type: "root", format: "", indent: 0, direction: null, version: 1
      }
    }
  });

/* Used to find nearest header as a string to group ul, block and paragraph to it */
const findParentHeadingString = (parent: any, childIndex: number) => {
  const h = findParentHeading(parent.children, "h6", childIndex - 1);
  return h ? sanitizeID(headerNodeToPlaintext(h)) : undefined;
};

const jsxConverters: (lang: "en" | "nb" | "nn", author: "SKDE" | "Helse Førde") =>
  JSXConvertersFunction<NodeTypes> = (lang, author) => ({
    defaultConverters,
  }) => {
    return ({
      ...defaultConverters,
      ...LinkJSXConverter({ internalDocToHref }),
      heading: (props) => {
        const { node, childIndex, nodesToJSX, parent } = props;
        const text = nodesToJSX({ nodes: node.children })
        const id = sanitizeID(headerNodeToPlaintext(node));

        const parentHeading: SerializedHeadingNode | null = findParentHeading((parent as any).children, node.tag, childIndex - 1);
        const full_id = parentHeading ? `${sanitizeID(headerNodeToPlaintext(parentHeading))}_${id}` : id;

        const Tag = node.tag;
        return <div className="not-prose"><Tag id={full_id}>{text}</Tag></div>;
      },
      /* paragraph, list and blocks ensures that these objects acts as
       * children to the nearest h2. This allows us to point the observer
       * to an entire paragraph. See useIntersectionByID() in ListItem.tsx */
      paragraph: ({ node, childIndex, nodesToJSX, parent }) => {
        const isEmpty = !headerNodeToPlaintext(node as any).trim();
        return (
          <p data-section={isEmpty ? undefined : findParentHeadingString(parent, childIndex)}>
            {nodesToJSX({ nodes: node.children })}
          </p>
        );
      },
      list: (props) => (
        <div data-section={findParentHeadingString(props.parent, props.childIndex)}>
          {(defaultConverters.list as any)(props)}
        </div>
      ),
      /* Stuff that isn't plaintext goes as blocks */
      blocks: {
        resultBox: ({ node, childIndex, parent }: { node: SerializedBlockNode<ResultBoxBlockProps>, childIndex: number, parent: any }) => {
          const parentHeading: SerializedHeadingNode | null = findParentHeading(parent.children, "h6", childIndex - 1);
          const id = sanitizeID(node.fields.blockName);
          const full_id = parentHeading ? `${sanitizeID(headerNodeToPlaintext(parentHeading))}_${id}` : id;
          return (
            <div id={full_id} data-section={findParentHeadingString(parent, childIndex)}>   {/* only change */}
              <Suspense fallback={<div className="my-32 justify-center flex"><CircularProgress /></div>}>
                <ResultBoxBlock lang={lang} author={author} {...node.fields} />
              </Suspense>
            </div>
          )
        },
        factBox: ({ node, childIndex, parent }: { node: SerializedBlockNode<FactBoxBlockProps>, childIndex: number, parent: any }) => (
          <div data-section={findParentHeadingString(parent, childIndex)}>
            <FactBoxBlock {...node.fields} />
          </div>
        ),
        table: ({ node, childIndex, parent }: { node: SerializedBlockNode<TableBlockProps>, childIndex: number, parent: any }) => (
          <div data-section={findParentHeadingString(parent, childIndex)}>
            <TableBlock {...node.fields} />
          </div>
        ),
        rawHTML: ({ node, childIndex, parent }: { node: SerializedBlockNode<RawHTMLBlockProps>, childIndex: number, parent: any }) => (
          <div data-section={findParentHeadingString(parent, childIndex)}>
            <RawHTMLBlock {...node.fields} />
          </div>
        ),
        mediaBlock: ({ node, childIndex, parent }: { node: SerializedBlockNode<MediaBlockProps>, childIndex: number, parent: any }) => (
          <div data-section={findParentHeadingString(parent, childIndex)}>
            <MediaBlock {...node.fields} />
          </div>
        ),
      },
      table: (props) => {
        const { node, nodesToJSX } = props;
        const content = nodesToJSX({ nodes: node.children })
        return (
          <table className="leading-none [&_td]:p-2! [&_p]:m-0 text-base overflow-auto border-collapse">
            <tbody>
              {content}
            </tbody>
          </table>
        )
      },
    })
  };

type Props = {
  data: DefaultTypedEditorState;
  lang?: "en" | "nb" | "nn";
  author?: "SKDE" | "Helse Førde";
  enableGutter?: boolean;
  enableProse?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export default function RichText(props: Props) {
  const { className, enableProse = true, enableGutter = true, author = "SKDE", lang = "nb", ...rest } = props;
  return <ConvertRichText converters={jsxConverters(lang, author)} {...rest} />;
}
