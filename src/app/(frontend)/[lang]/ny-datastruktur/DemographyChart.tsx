import { Alert } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import React from "react";
import { formatNumber } from "@/lib/helpers";
import type { Lang } from "@/types";
import { ChartFrame, type ChartFrameOptions } from "./ChartFrame";
import {
	type AnalysisData,
	type CategoryType,
	type DimensionValues,
	getDemographyRows,
	getDimension,
	type View,
} from "./chartData";

type DemographyChartProps = {
	data: AnalysisData;
	view: View;
	categoryType: CategoryType;
	dimensions: DimensionValues;
	years: number[];
	year: number;
	allYears: boolean;
	variableId: string;
	showGenders: boolean;
	proportion: boolean;
	lang: Lang;
	frameProps: ChartFrameOptions;
};

export function DemographyChart({
	data,
	view,
	categoryType,
	dimensions,
	years,
	year,
	allYears,
	variableId,
	showGenders,
	proportion,
	lang,
	frameProps,
}: DemographyChartProps) {
	const rows = React.useMemo(
		() =>
			getDemographyRows(
				data,
				view,
				variableId,
				allYears ? years : [year],
				dimensions,
				showGenders,
				proportion,
			),
		[
			data,
			view,
			variableId,
			allYears,
			years,
			year,
			dimensions,
			showGenders,
			proportion,
		],
	);
	const maxValue = React.useMemo(
		() =>
			Math.max(
				0,
				...years.flatMap((year) =>
					getDemographyRows(
						data,
						view,
						variableId,
						[year],
						dimensions,
						showGenders,
						proportion,
					).flatMap((row) =>
						Object.values(row.values).flatMap((value) =>
							value === null ? [] : [value],
						),
					),
				),
			),
		[data, view, variableId, years, dimensions, showGenders, proportion],
	);
	const genders = getDimension(data, "kjonn").values ?? [];
	const series = showGenders
		? genders.map((gender) => ({ id: gender.id, label: gender.label[lang] }))
		: [
				{
					id: "combined",
					label: lang === "en" ? "Both genders" : "Begge kjønn",
				},
			];
	const hasMissingValues = rows.some((row) =>
		Object.values(row.values).some((value) => value === null),
	);
	const categoryLabel = (id: string) => {
		const category = categoryType.categories.find(
			(category) => category.id === id,
		);
		if (!category)
			throw new Error(`Unknown category: ${categoryType.id}/${id}`);
		return category.label[lang].replaceAll("_", " ");
	};

	return (
		<ChartFrame
			{...frameProps}
			warning={hasMissingValues && (
				<Alert severity="warning" className="mx-4 sm:mx-8">
					{lang === "en"
						? "Some observations are missing or have no population denominator; gaps are shown in the chart."
						: "Noen observasjoner mangler eller har ingen befolkningsnevner; disse vises som hull i diagrammet."}
				</Alert>
			)}
		>
			<LineChart
				xAxis={[
					{
						scaleType: "point",
						data: rows.map((row) => row.category),
						valueFormatter: categoryLabel,
						height: "auto",
					},
				]}
				yAxis={[
					{
						min: 0,
						max: maxValue > 0 ? maxValue * 1.01 : 1,
						width: "auto",
						valueFormatter: (value: number | null) =>
							value === null
								? "-"
								: formatNumber(
										value,
										lang,
										proportion ? { style: "percent" } : undefined,
									),
					},
				]}
				series={series.map((series) => ({
					...series,
					data: rows.map((row) => row.values[series.id]),
					color: series.id === genders[0]?.id ? "#95BDE6" : "#00509E",
					showMark: false,
					valueFormatter: (value: number | null) =>
						value === null
							? "-"
							: formatNumber(
									value,
									lang,
									proportion
										? { style: "percent" }
										: { maximumFractionDigits: 0 },
								),
				}))}
				hideLegend={!showGenders || genders.length < 2}
				localeText={{
					noData:
						lang === "en"
							? "No data for this selection"
							: "Ingen data for dette utvalget",
				}}
			/>
		</ChartFrame>
	);
}
