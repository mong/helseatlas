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
  RawHTMLBlock as RawHTMLBlockProps,
} from 'src/payload-types'
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
import { Grid, CircularProgress } from "@mui/material";

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
        return <Tag id={full_id}>{text}</Tag>;
      },
      blocks: {
        resultBox: ({ node, childIndex, parent }: { node: SerializedBlockNode<ResultBoxBlockProps>, childIndex: number, parent: any }) => {
          const parentHeading: SerializedHeadingNode | null = findParentHeading(parent.children, "h6", childIndex - 1);
          const id = sanitizeID(node.fields.blockName);
          const full_id = parentHeading ? `${sanitizeID(headerNodeToPlaintext(parentHeading))}_${id}` : id;
          return (
            <div id={full_id}>
              <Suspense fallback={<Grid container justifyContent="center" sx={{ padding: 10 }}><CircularProgress /></Grid>}>
                <ResultBoxBlock lang={lang} author={author} {...node.fields} />
              </Suspense>
            </div>
          )
        },
        factBox: ({ node }: { node: SerializedBlockNode<FactBoxBlockProps> }) => <FactBoxBlock {...node.fields} />,
        table: ({ node }: { node: SerializedBlockNode<TableBlockProps> }) => <TableBlock {...node.fields} />,
        rawHTML: ({ node }: { node: SerializedBlockNode<RawHTMLBlockProps> }) => <RawHTMLBlock {...node.fields} />,
        mediaBlock: ({ node }: { node: SerializedBlockNode<MediaBlockProps> }) => <MediaBlock {...node.fields} />,
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
