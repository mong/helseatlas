import { Alert } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import React from "react";
import { AnalyseBarChart } from "@/components/Charts/AnalyseBarChart";
import { formatNumber } from "@/lib/helpers";
import type { Lang } from "@/types";
import { ChartFrame, type ChartFrameOptions } from "./ChartFrame";
import {
	type AnalysisData,
	type CategoryType,
	type DimensionValues,
	getBarRows,
	getTrendRows,
	type View,
} from "./chartData";

type GeographicChartsProps = {
	data: AnalysisData;
	view: View;
	categoryType: CategoryType;
	dimensions: DimensionValues;
	years: number[];
	year: number;
	mode: "enkeltår" | "tidstrend";
	variableId: string;
	selection: Set<string>;
	showNorway: boolean;
	onCategoryClick: (category: string) => void;
	lang: Lang;
	frameProps: ChartFrameOptions;
};

export function GeographicCharts({
	data,
	view,
	categoryType,
	dimensions,
	years,
	year,
	mode,
	variableId,
	selection,
	showNorway,
	onCategoryClick,
	lang,
	frameProps,
}: GeographicChartsProps) {
	const isRate = dimensions.rate_eller_antall === "rate";
	const categoryLabel = (id: string) => {
		const category = categoryType.categories.find(
			(category) => category.id === id,
		);
		if (!category)
			throw new Error(`Unknown category: ${categoryType.id}/${id}`);
		return category.label[lang].replaceAll("_", " ");
	};
	const valueFmt = (value: number | null) =>
		value === null
			? "-"
			: formatNumber(
					value,
					lang,
					dimensions.rate_eller_antall === "antall" &&
						dimensions.pasienter_eller_kontaktdager === "pasienter"
						? { maximumFractionDigits: 0 }
						: undefined,
				);
	const barRowsByYear = React.useMemo(
		() =>
			mode !== "enkeltår"
				? []
				: years.map((year) => ({
						year,
						rows: getBarRows(data, view, categoryType.id, {
							...dimensions,
							year,
						}),
					})),
		[data, view, categoryType.id, dimensions, years, mode],
	);
	const barRows =
		barRowsByYear.find((entry) => entry.year === year)?.rows ?? [];
	const barMax = Math.max(
		0,
		...barRowsByYear.flatMap((entry) =>
			entry.rows
				.filter((row) => row.category !== "norge")
				.map((row) => row.sum),
		),
	);
	const trendRows = React.useMemo(
		() =>
			mode !== "tidstrend"
				? []
				: getTrendRows(data, view, categoryType.id, variableId, dimensions),
		[data, view, categoryType.id, variableId, dimensions, mode],
	);
	const trendCategories = categoryType.categories.filter((category) =>
		category.id === "norge" ? isRate || showNorway : selection.has(category.id),
	);
	const trendMax = Math.max(
		0,
		...trendRows.flatMap((row) =>
			categoryType.categories
				.filter((category) => category.id !== "norge" || isRate || showNorway)
				.flatMap((category) => {
					const value = row.values[category.id];
					return value === null ? [] : [value];
				}),
		),
	);
	const hasMissingValues = trendRows.some((row) =>
		trendCategories.some((category) => row.values[category.id] === null),
	);

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
			{mode === "enkeltår" ? (
				<AnalyseBarChart
					categories={barRows
						.filter((row) => row.category !== "norge" || isRate)
						.map((row) => row.category)}
					categoryFmt={categoryLabel}
					variables={view.variables.map((variable) => variable.id)}
					variableFmt={(id) => {
						const variable = view.variables.find(
							(variable) => variable.id === id,
						);
						if (!variable) throw new Error(`Unknown variable: ${id}`);
						return variable.label[lang];
					}}
					valueGetter={(category, variable) => {
						const row = barRows.find((row) => row.category === category);
						if (!row) throw new Error(`Missing bar category: ${category}`);
						return row.values[variable];
					}}
					valueAxisFmt={(value) => formatNumber(value, lang)}
					valueFmt={valueFmt}
					special_values={new Set(["norge"])}
					selection={selection}
					onClick={onCategoryClick}
					maxValue={barMax > 0 ? barMax * 1.01 : 1}
				/>
			) : trendCategories.length === 0 ? (
				<Alert severity="info">
					{lang === "en"
						? "No referral areas selected"
						: "Ingen opptaksområder valgt"}
				</Alert>
			) : (
				<LineChart
					xAxis={[
						{
							scaleType: "point",
							data: trendRows.map((row) => row.year),
							valueFormatter: String,
							height: "auto",
						},
					]}
					yAxis={[
						{
							min: 0,
							max: trendMax > 0 ? trendMax * 1.01 : 1,
							width: "auto",
						},
					]}
					series={trendCategories.map((category) => ({
						id: category.id,
						label: categoryLabel(category.id),
						data: trendRows.map((row) => row.values[category.id]),
						valueFormatter: valueFmt,
						curve: "linear",
						showMark: true,
						...(category.id === "norge" ? { color: "#9AA2AB" } : {}),
					}))}
				/>
			)}
		</ChartFrame>
	);
}
