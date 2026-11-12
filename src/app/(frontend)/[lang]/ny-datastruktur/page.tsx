"use client";
import { HeroBanner, PageContent, PageLayout } from "@mong/material-ui";
import { CircularProgress } from "@mui/material";
import { Suspense } from "react";
import {
	type AnalyserPocMock,
	ChartContainerPocMock,
} from "@/app/(frontend)/[lang]/ny-datastruktur/ChartContainerPocMock";
import { MaxWidth } from "@/components/MaxWidth";
import dict from "@/dictionaries/no.json";
import analyseNew from "./autisme-barn-new.json";

export default function NyDatastrukturPage() {
	const analyseNewFormat: AnalyserPocMock = {
		id: 1,
		title: "Autisme barn",
		author: "SKDE",
		norskType: "nn",
		updatedAt: "2024-06-01",
		createdAt: "2024-01-01",
		data: analyseNew,
	};

	return (
		<div className="flex flex-col gap-10 border w-full p-10 grow">
			<PageLayout>
				<div className="bg-white py-0">
					<PageContent color="white">
						<HeroBanner
							title="Proof of Concept datastruktur"
							description="Dette er en proof of concept for en ny datastruktur"
							image="/background.jpeg"
						/>
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
									analyse={analyseNewFormat}
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
