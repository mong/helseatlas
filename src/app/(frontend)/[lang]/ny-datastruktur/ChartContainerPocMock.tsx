"use client";

import {
	Accordion,
	AccordionItem,
	Dropdown,
	SplitButton,
	ToggleButton,
	ToggleButtonGroup,
} from "@mong/material-ui";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BarChartIcon from "@mui/icons-material/BarChart";
import CloseIcon from "@mui/icons-material/Close";
import DomainAddIcon from "@mui/icons-material/DomainAdd";
import GroupsIcon from "@mui/icons-material/Groups";
import InsightsIcon from "@mui/icons-material/InsightsOutlined";
import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import {
	Alert,
	Box,
	FormControlLabel,
	IconButton,
	Paper,
	Slider,
	Snackbar,
	Stack,
	Switch,
	styled,
	Tab,
	Tabs,
	Typography,
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { snapdom } from "@zumer/snapdom";
import React from "react";
import { JSONTree } from "react-json-tree";
import { AnalyseBarChart } from "@/components/Charts/AnalyseBarChart";
import { formatNumber } from "@/lib/helpers";
import type { Lang } from "@/types";
import {
	type AnalysisData,
	type DimensionValues,
	getBarRows,
	getCategoryType,
	getDemographyRows,
	getDimension,
	getDimensionValues,
	getEnumDimensions,
	getTrendRows,
	getView,
	getYears,
	type View,
} from "./chartData";

export interface AnalyserPocMock {
	id: number;
	title: string;
	author: "SKDE" | "Helse Førde";
	norskType: "nb" | "nn";
	updatedAt: string;
	createdAt: string;
	data: AnalysisData;
}

export type ChartContainerPocMockProps = {
	analyse: AnalyserPocMock;
	lang: Lang;
	dict: { [key: string]: { [key: string]: string } };
	nynorsk?: boolean;
};

const MyTabList = styled(TabList)({
	"& .Mui-selected": { background: "white" },
	"& .MuiButtonBase-root": {
		minHeight: "unset",
		height: 48,
		borderRadius: "8px 8px 0px 0px",
	},
});

const jsonTreeTheme = {
	extend: "monokai",
	tree: { flex: 1, minWidth: 0, margin: 0, overflow: "auto", padding: "20px" },
};

type YearSelectorProps = {
	years: number[];
	year: number;
	setYear: (year: number) => void;
	dict: ChartContainerPocMockProps["dict"];
	lang: Lang;
};

function YearSelector({ years, year, setYear, dict, lang }: YearSelectorProps) {
	const [animating, setAnimating] = React.useState(false);
	const lastYear = years[years.length - 1];
	React.useEffect(() => {
		if (!animating) return;
		const timer = setTimeout(() => {
			const index = years.indexOf(year);
			if (index === years.length - 1) setAnimating(false);
			else setYear(years[index + 1]);
		}, 600);
		return () => clearTimeout(timer);
	}, [animating, year, years, setYear]);

	return (
		<>
			<div className="block sm:hidden w-45 mb-4">
				<Dropdown
					items={{
						groups: [
							{
								items: years.toReversed().map((year) => ({
									label: String(year),
									value: String(year),
								})),
							},
						],
					}}
					onChange={(event) => setYear(Number(event.target.value))}
					placeholder={dict.analysebox.choose_year}
					value={String(year)}
				/>
			</div>
			<div className="hidden sm:block">
				<Stack direction="row">
					<IconButton
						aria-label={
							animating ? "Pause" : lang === "en" ? "Play" : "Spill av"
						}
						onClick={() => {
							if (!animating && year === lastYear) setYear(years[0]);
							setAnimating(!animating);
						}}
						disabled={years.length < 2}
					>
						{animating ? <PauseIcon /> : <PlayArrowIcon />}
					</IconButton>
					<Box sx={{ flexGrow: 1, marginX: 2, marginRight: 4 }}>
						<Slider
							track={false}
							value={year}
							min={years[0]}
							max={lastYear}
							step={null}
							marks={years.map((year) => ({
								value: year,
								label: String(year),
							}))}
							onChange={(_, value) => {
								if (typeof value === "number") setYear(value);
							}}
							valueLabelDisplay="auto"
							aria-label={dict.analysebox.choose_year}
							disabled={years.length < 2}
							sx={{
								"@media (max-width: 600px)": {
									"& .MuiSlider-markLabel": { fontSize: "0.75rem" },
								},
							}}
						/>
					</Box>
				</Stack>
			</div>
		</>
	);
}

function DimensionControls({
	data,
	view,
	values,
	onChange,
	lang,
	exclude = [],
}: {
	data: AnalysisData;
	view: View;
	values: DimensionValues;
	onChange: (values: DimensionValues) => void;
	lang: Lang;
	exclude?: string[];
}) {
	return getEnumDimensions(data, view)
		.filter((dimension) => !exclude.includes(dimension.id))
		.map((dimension) => (
			<ToggleButtonGroup
				{...toggleButtonGroupProps}
				key={dimension.id}
				value={values[dimension.id]}
				exclusive
				aria-label={dimension.label?.[lang] ?? dimension.id}
				onChange={(_, value: string | null) => {
					if (value !== null) onChange({ ...values, [dimension.id]: value });
				}}
			>
				{dimension.values?.map((value) => (
					<ToggleButton
						key={value.id}
						value={value.id}
						className={filterControlClasses}
					>
						{value.label[lang]}
					</ToggleButton>
				))}
			</ToggleButtonGroup>
		));
}

const filterControlClasses = "w-30";
const toggleButtonGroupProps = { exclusive: true };

export function ChartContainerPocMock({
	analyse,
	lang,
	dict,
}: ChartContainerPocMockProps) {
	const data = analyse.data;
	const [viewId, setViewId] = React.useState("total");
	const [analyseTab, setAnalyseTab] = React.useState<"enkeltår" | "tidstrend">(
		"enkeltår",
	);
	const [categoryTypeId, setCategoryTypeId] = React.useState("sykehus");
	const [dimensionSelection, setDimensionSelection] =
		React.useState<DimensionValues>({});
	const [selectedCategories, setSelectedCategories] = React.useState<
		Record<string, string[]>
	>({});
	const [variableSelection, setVariableSelection] = React.useState<
		Record<string, string>
	>({});
	const [showNorway, setShowNorway] = React.useState(false);
	const [showGenders, setShowGenders] = React.useState(true);
	const [proportion, setProportion] = React.useState(false);
	const [allYears, setAllYears] = React.useState(true);
	const [selectedYear, setSelectedYear] = React.useState<number>();
	const [notification, setNotification] = React.useState<{
		message: string;
		error: boolean;
	}>();
	const graphRef = React.useRef<HTMLDivElement>(null);
	const chartId = React.useId();

	const view = getView(data, viewId);
	const isDemography = view.id === "demografi";
	const dimensions = React.useMemo(
		() => getDimensionValues(data, view, dimensionSelection),
		[data, view, dimensionSelection],
	);
	const categoryType = getCategoryType(
		data,
		view.categoryTypes.includes(categoryTypeId)
			? categoryTypeId
			: view.categoryTypes[0],
	);
	const years = React.useMemo(() => getYears(data, view.id), [data, view.id]);
	const year =
		selectedYear === undefined
			? years[years.length - 1]
			: years.reduce(
					(closest, candidate) =>
						Math.abs(candidate - selectedYear) <
						Math.abs(closest - selectedYear)
							? candidate
							: closest,
					years[0],
				);
	const variables = view.variables.filter(
		(variable) => !isDemography || variable.id !== "population",
	);
	if (!variables.length)
		throw new Error(`View ${view.id} has no display variables`);
	const variable =
		variables.find((variable) => variable.id === variableSelection[view.id]) ??
		variables[0];
	const selection = new Set(selectedCategories[categoryType.id] ?? []);
	const isRate = dimensions.rate_eller_antall === "rate";
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
	const categoryLabel = (id: string) => {
		const category = categoryType.categories.find(
			(category) => category.id === id,
		);
		if (!category)
			throw new Error(`Unknown category: ${categoryType.id}/${id}`);
		return category.label[lang].replaceAll("_", " ");
	};
	const caption = [
		analyse.title,
		view.label[lang],
		...getEnumDimensions(data, view)
			.filter((dimension) => !isDemography || dimension.id !== "kjonn")
			.map(
				(dimension) =>
					dimension.values?.find(
						(value) => value.id === dimensions[dimension.id],
					)?.label[lang],
			),
		isDemography
			? `${variable.label[lang]} · ${proportion ? dict.analysebox.andel : dict.analysebox.antall}`
			: analyseTab === "tidstrend"
				? variable.label[lang]
				: undefined,
		(isDemography && allYears) || (!isDemography && analyseTab === "tidstrend")
			? `${years[0]}-${years[years.length - 1]}`
			: String(year),
	]
		.filter(Boolean)
		.join(" · ");

	const barRowsByYear = React.useMemo(
		() =>
			isDemography
				? []
				: years.map((year) => ({
						year,
						rows: getBarRows(data, view, categoryType.id, {
							...dimensions,
							year,
						}),
					})),
		[data, view, categoryType.id, dimensions, years, isDemography],
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
			isDemography
				? []
				: getTrendRows(data, view, categoryType.id, variable.id, dimensions),
		[data, view, categoryType.id, variable.id, dimensions, isDemography],
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
	const demographyRows = React.useMemo(
		() =>
			!isDemography
				? []
				: getDemographyRows(
						data,
						view,
						variable.id,
						allYears ? years : [year],
						dimensions,
						showGenders,
						proportion,
					),
		[
			data,
			view,
			variable.id,
			allYears,
			years,
			year,
			dimensions,
			showGenders,
			proportion,
			isDemography,
		],
	);
	const demographyMax = React.useMemo(
		() =>
			!isDemography
				? 0
				: Math.max(
						0,
						...years.flatMap((year) =>
							getDemographyRows(
								data,
								view,
								variable.id,
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
		[
			data,
			view,
			variable.id,
			years,
			dimensions,
			showGenders,
			proportion,
			isDemography,
		],
	);
	const genders = isDemography
		? (getDimension(data, "kjonn").values ?? [])
		: [];
	const demographySeries = showGenders
		? genders.map((gender) => ({ id: gender.id, label: gender.label[lang] }))
		: [
				{
					id: "combined",
					label: lang === "en" ? "Both genders" : "Begge kjønn",
				},
			];
	const hasMissingValues = isDemography
		? demographyRows.some((row) =>
				Object.values(row.values).some((value) => value === null),
			)
		: analyseTab === "tidstrend" &&
			trendRows.some((row) =>
				trendCategories.some((category) => row.values[category.id] === null),
			);

	function toggleCategory(id: string) {
		if (id === "norge") return;
		setSelectedCategories((previous) => {
			const selected = new Set(previous[categoryType.id] ?? []);
			if (selected.has(id)) selected.delete(id);
			else selected.add(id);
			return { ...previous, [categoryType.id]: [...selected] };
		});
	}

	async function download(option: string) {
		try {
			if (option === dict.analysebox.download_data) {
				const url = URL.createObjectURL(
					new Blob([JSON.stringify(data, null, 2)], {
						type: "application/json",
					}),
				);
				const link = document.createElement("a");
				link.href = url;
				link.download = `${analyse.title}.json`;
				document.body.appendChild(link);
				link.click();
				link.remove();
				setTimeout(() => URL.revokeObjectURL(url), 0);
				return;
			}
			if (!graphRef.current)
				throw new Error("The chart is not available for export");
			if (option === dict.analysebox.copy_graph) {
				const blob = await snapdom.toBlob(graphRef.current, { type: "png" });
				if (!blob) throw new Error("Unable to create a chart image");
				await navigator.clipboard.write([
					new ClipboardItem({ [blob.type]: blob }),
				]);
				setNotification({
					message: dict.analysebox.copy_graph_snackbar_message,
					error: false,
				});
			} else if (option === dict.analysebox.download_graph) {
				const result = await snapdom(graphRef.current);
				await result.download({
					format: "png",
					backgroundColor: "white",
					filename: `${analyse.title}_${view.id}_${
						isDemography && allYears
							? "all_years"
							: !isDemography && analyseTab === "tidstrend"
								? "tidstrend"
								: year
					}.png`,
				});
			}
		} catch (error) {
			console.error("Chart export failed", error);
			setNotification({
				message: `${lang === "en" ? "Export failed" : "Eksport feilet"}: ${error instanceof Error ? error.message : String(error)}`,
				error: true,
			});
		}
	}

	const downloadButton = (
		<SplitButton
			label={dict.analysebox.download}
			onClick={download}
			options={[
				dict.analysebox.copy_graph,
				dict.analysebox.download_graph,
				dict.analysebox.download_data,
			]}
			steps="one-step"
		/>
	);
	const variableSelector = (
		<div className="w-45 sm:w-55 md:w-62.5">
			<Dropdown
				items={{
					groups: [
						{
							items: variables.map((variable) => ({
								label: variable.label[lang],
								value: variable.id,
							})),
						},
					],
				}}
				placeholder={dict.analysebox.choose_variable}
				value={variable.id}
				onChange={(event) =>
					setVariableSelection((previous) => ({
						...previous,
						[view.id]: String(event.target.value),
					}))
				}
			/>
		</div>
	);
	const noData =
		lang === "en"
			? "No data for this selection"
			: "Ingen data for dette utvalget";

	return (
		<>
			<div className="pt-2 pb-12 mt-1">
				<Accordion
					keyId="debug-accordion"
					gap="2"
					variant="text"
					type="allowMultiple"
				>
					<AccordionItem title="State">
						<JSONTree
							data={{
								viewId,
								year,
								categoryType: categoryType.id,
								dimensions,
								selectedCategories,
								variable: variable.id,
							}}
							theme={jsonTreeTheme}
							invertTheme={false}
							hideRoot
						/>
					</AccordionItem>
				</Accordion>
			</div>
			<Box sx={{ width: "100%", typography: "body1" }}>
				<TabContext value={viewId}>
					<MyTabList
						onChange={(_, value: string) => setViewId(value)}
						aria-label={lang === "en" ? "Data view" : "Datavisning"}
						variant="scrollable"
						scrollButtons="auto"
					>
						{data.views.map((view) => (
							<Tab
								key={view.id}
								value={view.id}
								label={view.id === "total" ? "Analyse" : view.label[lang]}
								icon={
									view.id === "total" ? (
										<AssessmentIcon fontSize="small" />
									) : view.id === "demografi" ? (
										<GroupsIcon fontSize="small" />
									) : view.id === "behandler" ? (
										<DomainAddIcon fontSize="small" />
									) : (
										<MedicalInformationIcon fontSize="small" />
									)
								}
								iconPosition="start"
								sx={{ textTransform: "none" }}
							/>
						))}
					</MyTabList>
					<Paper
						sx={{ background: "white", borderRadius: "0px 0px 8px 8px" }}
						elevation={2}
					>
						<TabPanel value={viewId} sx={{ paddingX: 0, paddingBottom: 0 }}>
							<div className="flex flex-wrap justify-between gap-4 px-4 sm:px-8 mb-10 w-full h-20">
								{!isDemography && (
									<>
										<div className="w-full">
											<Dropdown
												multiple
												removeAll={dict.analysebox.remove_choice}
												items={{
													groups: [
														{
															items: categoryType.categories
																.filter((category) => category.id !== "norge")
																.map((category) => ({
																	label: categoryLabel(category.id),
																	value: category.id,
																})),
														},
													],
												}}
												placeholder={`${dict.analysebox.choose_area}${selection.size ? ` (${selection.size})` : ""}`}
												value={[...selection]}
												onChange={(event) =>
													setSelectedCategories((previous) => ({
														...previous,
														[categoryType.id]: Array.from(event.target.value),
													}))
												}
											/>
										</div>
										<ToggleButtonGroup
											{...toggleButtonGroupProps}
											value={categoryType.id}
											aria-label={
												lang === "en" ? "Category type" : "Områdetype"
											}
											onChange={(_, value: string | null) => {
												if (value !== null) setCategoryTypeId(value);
											}}
										>
											{view.categoryTypes.map((id) => (
												<ToggleButton
													key={id}
													value={id}
													className={filterControlClasses}
												>
													{getCategoryType(data, id).label[lang]}
												</ToggleButton>
											))}
										</ToggleButtonGroup>
									</>
								)}
								<DimensionControls
									data={data}
									view={view}
									values={dimensions}
									onChange={setDimensionSelection}
									lang={lang}
									exclude={isDemography ? ["kjonn"] : []}
								/>
								{isDemography && (
									<>
										<ToggleButtonGroup
											value={showGenders}
											{...toggleButtonGroupProps}
											onChange={(_, value: boolean | null) => {
												if (value !== null) setShowGenders(value);
											}}
										>
											<ToggleButton
												value={false}
												className={filterControlClasses}
											>
												{dict.analysebox.alle}
											</ToggleButton>
											<ToggleButton
												value={true}
												className={filterControlClasses}
											>
												{dict.analysebox.demography_split_gender}
											</ToggleButton>
										</ToggleButtonGroup>
										<ToggleButtonGroup
											value={proportion}
											{...toggleButtonGroupProps}
											onChange={(_, value: boolean | null) => {
												if (value !== null) setProportion(value);
											}}
										>
											<ToggleButton
												value={false}
												className={filterControlClasses}
											>
												{dict.analysebox.antall}
											</ToggleButton>
											<ToggleButton
												value={true}
												className={filterControlClasses}
											>
												{dict.analysebox.andel}
											</ToggleButton>
										</ToggleButtonGroup>
										{variableSelector}
										<ToggleButtonGroup
											value={allYears}
											{...toggleButtonGroupProps}
											onChange={(_, value: boolean | null) => {
												if (value !== null) setAllYears(value);
											}}
										>
											<ToggleButton
												value={true}
												className={filterControlClasses}
											>
												{dict.analysebox.all_years}
											</ToggleButton>
											<ToggleButton
												value={false}
												className={filterControlClasses}
											>
												{dict.analysebox.choose_year}
											</ToggleButton>
										</ToggleButtonGroup>
									</>
								)}
							</div>
							{!isDemography && (
								<Box
									sx={{ borderBottom: 1, borderColor: "divider" }}
									className="mx-4 sm:mx-8 mb-4"
								>
									<Tabs
										value={analyseTab}
										onChange={(_, value: "enkeltår" | "tidstrend") =>
											setAnalyseTab(value)
										}
										aria-label={lang === "en" ? "Chart type" : "Diagramtype"}
									>
										<Tab
											icon={<BarChartIcon fontSize="small" />}
											iconPosition="start"
											id={`${chartId}-enkeltår`}
											aria-controls={chartId}
											label={dict.analysebox.single_year}
											value="enkeltår"
											sx={{ textTransform: "none" }}
										/>
										<Tab
											icon={<InsightsIcon fontSize="small" />}
											iconPosition="start"
											id={`${chartId}-tidstrend`}
											aria-controls={chartId}
											label={dict.analysebox.time_series}
											value="tidstrend"
											sx={{ textTransform: "none" }}
										/>
									</Tabs>
								</Box>
							)}
							<div className="flex flex-wrap gap-4 px-4 sm:px-8 mb-4">
								{!isDemography && analyseTab === "tidstrend" && (
									<>
										{variableSelector}
										{!isRate && (
											<FormControlLabel
												control={
													<Switch
														checked={showNorway}
														onChange={(_, checked) => setShowNorway(checked)}
													/>
												}
												label={dict.analysebox.show_norway}
											/>
										)}
									</>
								)}
								<div className="ml-auto shrink-0">{downloadButton}</div>
							</div>
							{(isDemography ? !allYears : analyseTab === "enkeltår") && (
								<div className="px-4 sm:px-8">
									<YearSelector
										years={years}
										year={year}
										setYear={setSelectedYear}
										dict={dict}
										lang={lang}
									/>
								</div>
							)}
							{hasMissingValues && (
								<Alert severity="warning" className="mx-4 sm:mx-8">
									{lang === "en"
										? "Some observations are missing or have no population denominator; gaps are shown in the chart."
										: "Noen observasjoner mangler eller har ingen befolkningsnevner; disse vises som hull i diagrammet."}
								</Alert>
							)}
							<div
								className="px-0 md:px-8"
								ref={graphRef}
								id={chartId}
								role={isDemography ? undefined : "tabpanel"}
								// aria-labelledby={isDemography ? undefined : `${chartId}-${analyseTab}`}
							>
								<Box
									sx={{
										width: "100%",
										height: "80vw",
										maxHeight: 700,
										minHeight: 370,
										position: "relative",
									}}
								>
									{!isDemography && analyseTab === "enkeltår" && (
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
												if (!variable)
													throw new Error(`Unknown variable: ${id}`);
												return variable.label[lang];
											}}
											valueGetter={(category, variable) => {
												const row = barRows.find(
													(row) => row.category === category,
												);
												if (!row)
													throw new Error(`Missing bar category: ${category}`);
												return row.values[variable];
											}}
											valueAxisFmt={(value) => formatNumber(value, lang)}
											valueFmt={valueFmt}
											special_values={new Set(["norge"])}
											selection={selection}
											onClick={toggleCategory}
											maxValue={barMax > 0 ? barMax * 1.01 : 1}
										/>
									)}
									{!isDemography &&
										analyseTab === "tidstrend" &&
										(trendCategories.length === 0 ? (
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
													...(category.id === "norge"
														? { color: "#9AA2AB" }
														: {}),
												}))}
											/>
										))}
									{isDemography && (
										<LineChart
											xAxis={[
												{
													scaleType: "point",
													data: demographyRows.map((row) => row.category),
													valueFormatter: categoryLabel,
													height: "auto",
												},
											]}
											yAxis={[
												{
													min: 0,
													max: demographyMax > 0 ? demographyMax * 1.01 : 1,
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
											series={demographySeries.map((series) => ({
												...series,
												data: demographyRows.map(
													(row) => row.values[series.id],
												),
												color:
													series.id === genders[0]?.id ? "#95BDE6" : "#00509E",
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
											localeText={{ noData }}
										/>
									)}
									<Box
										component="img"
										alt={`${analyse.author} logo`}
										src={
											analyse.author === "SKDE"
												? "/img/logo-skde-graa.svg"
												: "/img/helse-forde-graa.svg"
										}
										sx={{
											width: "15vw",
											maxWidth: analyse.author === "SKDE" ? 100 : 150,
											position: "absolute",
											bottom: 55,
											right: 30,
											pointerEvents: "none",
										}}
									/>
								</Box>
								<Typography
									variant="body2"
									sx={{ textAlign: "center", padding: 2, paddingBottom: 3 }}
								>
									{caption}
								</Typography>
							</div>
						</TabPanel>
					</Paper>
				</TabContext>
				<Snackbar
					open={notification !== undefined}
					autoHideDuration={4000}
					onClose={() => setNotification(undefined)}
					anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
				>
					<Alert
						severity={notification?.error ? "error" : "success"}
						action={
							<IconButton
								size="small"
								color="inherit"
								aria-label={lang === "en" ? "Close" : "Lukk"}
								onClick={() => setNotification(undefined)}
							>
								<CloseIcon fontSize="small" />
							</IconButton>
						}
					>
						{notification?.message}
					</Alert>
				</Snackbar>
			</Box>
		</>
	);
}
