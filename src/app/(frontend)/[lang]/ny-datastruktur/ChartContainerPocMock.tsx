import {
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
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import {
	Alert,
	Box,
	FormControlLabel,
	IconButton,
	Paper,
	Snackbar,
	Switch,
	styled,
	Tab,
	Tabs,
} from "@mui/material";
import { snapdom } from "@zumer/snapdom";
import React from "react";
import DebugDatastruktur from "@/app/(frontend)/[lang]/ny-datastruktur/debug-datastruktur";
import type { Lang } from "@/types";
import {
	DimensionControls,
	VariableSelector,
	YearSelector,
} from "./ChartControls";
import type { ChartFrameOptions } from "./ChartFrame";
import {
	type AnalysisData,
	type DimensionValues,
	getCategoryType,
	getDimensionValues,
	getEnumDimensions,
	getView,
	getYears,
} from "./chartData";
import { DemographyChart } from "./DemographyChart";
import { GeographicCharts } from "./GeographicCharts";

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

const ViewTabList = styled(TabList)({
	"& .Mui-selected": { background: "white" },
	"& .MuiButtonBase-root": {
		minHeight: "unset",
		height: 48,
		borderRadius: "8px 8px 0px 0px",
	},
});

const filterControlClasses = "w-30";

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
		<VariableSelector
			lang={lang}
			variables={variables}
			placeholder={dict.analysebox.choose_variable}
			value={variable.id}
			onChange={(event) =>
				setVariableSelection((previous) => ({
					...previous,
					[view.id]: String(event.target.value),
				}))
			}
		/>
	);
	const getIcon = (viewId: string) => {
		if (viewId === "total") return <AssessmentIcon fontSize="small" />;
		if (viewId === "demografi") return <GroupsIcon fontSize="small" />;
		if (viewId === "behandler") return <DomainAddIcon fontSize="small" />;
		if (viewId === "analyse") return <BarChartIcon fontSize="small" />;
		if (viewId === "tidstrend") return <InsightsIcon fontSize="small" />;
		return <MedicalInformationIcon fontSize="small" />;
	};
	const frameProps: ChartFrameOptions = {
		author: analyse.author,
		caption,
		graphRef,
		id: chartId,
		...(!isDemography && {
			role: "tabpanel",
			"aria-labelledby": `${chartId}-${analyseTab}`,
		}),
	};

	return (
		<Box sx={{ width: "100%", typography: "body1" }}>
			<DebugDatastruktur
				state={{
					viewId,
					year,
					categoryType,
					dimensions,
					selectedCategories,
					variable,
				}}
			/>
			<TabContext value={viewId}>
				<ViewTabList
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
							icon={getIcon(view.id)}
							iconPosition="start"
							sx={{ textTransform: "none" }}
						/>
					))}
				</ViewTabList>
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
										exclusive
										value={categoryType.id}
										aria-label={lang === "en" ? "Category type" : "Områdetype"}
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
										exclusive
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
										<ToggleButton value={true} className={filterControlClasses}>
											{dict.analysebox.demography_split_gender}
										</ToggleButton>
									</ToggleButtonGroup>
									<ToggleButtonGroup
										value={proportion}
										exclusive
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
										<ToggleButton value={true} className={filterControlClasses}>
											{dict.analysebox.andel}
										</ToggleButton>
									</ToggleButtonGroup>
									{variableSelector}
									<ToggleButtonGroup
										value={allYears}
										exclusive
										onChange={(_, value: boolean | null) => {
											if (value !== null) setAllYears(value);
										}}
									>
										<ToggleButton value={true} className={filterControlClasses}>
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
										icon={getIcon("analyse")}
										iconPosition="start"
										id={`${chartId}-enkeltår`}
										aria-controls={chartId}
										label={dict.analysebox.single_year}
										value="enkeltår"
										sx={{ textTransform: "none" }}
									/>
									<Tab
										icon={getIcon("tidstrend")}
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
						{!isDemography ? (
							<GeographicCharts
								data={data}
								view={view}
								categoryType={categoryType}
								dimensions={dimensions}
								years={years}
								year={year}
								mode={analyseTab}
								variableId={variable.id}
								selection={selection}
								showNorway={showNorway}
								onCategoryClick={toggleCategory}
								lang={lang}
								frameProps={frameProps}
							/>
						) : (
							<DemographyChart
								data={data}
								view={view}
								categoryType={categoryType}
								dimensions={dimensions}
								years={years}
								year={year}
								allYears={allYears}
								variableId={variable.id}
								showGenders={showGenders}
								proportion={proportion}
								lang={lang}
								frameProps={frameProps}
							/>
						)}
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
	);
}
