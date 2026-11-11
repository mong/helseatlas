"use client";
import {
	Accordion,
	AccordionItem,
	Box,
	Frame,
	PageContent,
	PageLayout,
} from "@mong/material-ui";
import { Alert, CircularProgress } from "@mui/material";
import { cache, Suspense } from "react";
import {
	type Base16Theme,
	JSONTree,
	type StylingConfig,
} from "react-json-tree";
import {
	AnalyserPocMock,
	ChartContainerPocMock,
} from "@/app/(frontend)/[lang]/ny-datastruktur/ChartContainerPocMock";
import { ChartContainer } from "@/components/Charts/ChartContainer";
import { MaxWidth } from "@/components/MaxWidth";
import RichText from "@/components/RichText";
import TagList from "@/components/TagList";
import dict from "@/dictionaries/no.json";
import { Analyser } from "@/payload-types";
import analyseNew from "./autisme-barn.json";
import analyseOld from "./autisme-barn-old.json";

const jsonTreeTheme = {
	extend: "monokai",
	tree: {
		width: "40%",
		height: "100%",
		margin: 0,
		overflow: "auto",
		padding: "20px",
	},
};

export default function NyDatastrukturPage() {
	const { lang, analyseName } = { lang: "nn", analyseName: "autisme-barn" };
	// const analyse = await queryAnalyseBySlug({ slug: analyseName, lang });
	// const tags =
	// 	analyse.tags?.filter((tag) => typeof tag === "object" && tag !== null) ||
	// 	[];

	const analyseNewFormat: AnalyserPocMock = {
		id: 1,
		title: "Autisme barn",
		author: "SKDE",
		norskType: "nn",
		updatedAt: "2024-06-01",
		createdAt: "2024-01-01",
		// @ts-expect-error
		data: analyseNew,
		// data: analyseOld,
	};
	const analyseOrgFormat: Analyser = {
		id: 1,
		name: "Autisme barn",
		author: "SKDE",
		norskType: "nn",
		updatedAt: "2024-06-01",
		createdAt: "2024-01-01",
		// data: analyseNew,
		// @ts-expect-error
		data: analyseOld,
	};
	// const dict = getDictionary("nn");

	return (
		<div className="flex flex-col gap-10 border w-full p-10 grow">
			<h3>Debug info:</h3>
			<Accordion
				keyId="debug-accordion"
				gap="2"
				variant="text"
				type="allowMultiple"
			>
				<AccordionItem title="Params and variables">
					<pre>{JSON.stringify({ lang, analyseName }, null, 2)}</pre>
				</AccordionItem>
				<AccordionItem title="analysedata">
					<div className="flex gap-8 w-full h-full overflow-auto">
						<JSONTree
							data={analyseOld}
							theme={jsonTreeTheme}
							invertTheme={false}
							hideRoot={true}
						/>
						<JSONTree
							data={analyseNew}
							theme={jsonTreeTheme}
							invertTheme={false}
							hideRoot={true}
						/>
						{/* <pre>{JSON.stringify({ analyseNew }, null, 2)}</pre> */}
						{/* <pre>{JSON.stringify({ analyseOld }, null, 2)}</pre> */}
					</div>
				</AccordionItem>

				<AccordionItem title="State" defaultOpen>
					~state vars go here~
				</AccordionItem>
			</Accordion>

			<PageLayout>
				<div className="bg-white py-8">
					<PageContent color="white">
						<MaxWidth size="small">
							<h1 className="my-4">{"tittel"}</h1>
							<h5 className="my-8">{"subheader"}</h5>
							{/* {analyse.tags && (
								<TagList
									tags={analyse.tags.filter(
										(tag) => typeof tag === "object" && tag !== null,
									)}
									lang={lang}
								/>
							)} */}
							[Taglist]
							{/* <div className="prose max-w-none prose-li:marker:text-black prose-li:my-0 text-large">
								<RichText data={analyse.summary} enableGutter={true} />
							</div>
							<div className="flex gap-x-12 gap-y-4 flex-wrap text-small">
								<span>
									{dict.general.by}: {analyse.author}
								</span>
								<span>
									{dict.general.updated}{" "}
									{makeDateElem(analyse.publishedAt || analyse.createdAt, lang)}
								</span>
							</div> */}
						</MaxWidth>
					</PageContent>
				</div>
				<PageContent>
					<Suspense
						fallback={
							<div className="my-32 justify-center flex">
								<CircularProgress />
							</div>
						}
					>
						<div className="py-8">
							<MaxWidth size="medium">
								<ChartContainerPocMock
									key={"hashlotsofdata"} // Providing key to update state when new files are uploaded in preview
									analyse={analyseOrgFormat}
									lang={"no"}
									dict={dict}
									nynorsk={false}
								/>
							</MaxWidth>
						</div>
					</Suspense>
				</PageContent>
			</PageLayout>
		</div>
	);
}

// const queryAnalyseBySlug = cache(
// 	async ({
// 		slug,
// 		lang,
// 		disableDraft = false,
// 	}: {
// 		slug: string;
// 		lang: Lang;
// 		disableDraft?: boolean;
// 	}) => {
// 		// const { isEnabled: draft } = await draftMode();

// 		// const payload = [analyse];

// 		// const result = await payload.find({
// 		// 	collection: "analyser",
// 		// 	draft: false,
// 		// 	limit: 1,
// 		// 	overrideAccess: false,
// 		// 	pagination: false,
// 		// 	locale: lang,
// 		// 	fallbackLocale: false,
// 		// 	where: {
// 		// 		slug: {
// 		// 			equals: slug,
// 		// 		},
// 		// 	},
// 		// });
// 		const resultMock = {
// 			collection: "analyser",
// 			draft: false,
// 			limit: 1,
// 			overrideAccess: false,
// 			pagination: false,
// 			locale: lang,
// 			fallbackLocale: false,
// 			where: {
// 				slug: {
// 					equals: slug,
// 				},
// 			},
// 		};
// 		return resultMock.docs?.[0] || null;
// 	},
// );
