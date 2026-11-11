"use client";

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
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import {
	Box,
	FormControlLabel,
	IconButton,
	Paper,
	Slide,
	Slider,
	Snackbar,
	Stack,
	Switch,
	styled,
	Tab,
	Typography,
} from "@mui/material";
import { snapdom } from "@zumer/snapdom";
import React, { JSX, PropsWithChildren } from "react";
import { JSONTree } from "react-json-tree";
import { AnalyseBarChart } from "@/components/Charts/AnalyseBarChart";
import AnalyseDemography from "@/components/Charts/AnalyseDemography";
import { AnalyseLineChart } from "@/components/Charts/AnalyseLineChart";
import downloadJSON from "@/lib/downloadJSON";
import {
	capitalize,
	formatNumber,
	getCategory,
	getDescription,
	getVariableText,
} from "@/lib/helpers";
import { getAreaName, hospitalStructure, Selection } from "@/lib/selection";
import { Analyser, Tag } from "@/payload-types";
import { Lang } from "@/types";

const BACKGROUND_COLOR = "white";

type VariableSelectorProps = {
	analyse: AnalyserPocMock["data"];
	views: AnalyserPocMock["data"]["views"];
	dict: { [k: string]: { [k: string]: string } };
	variable: { viewName: string; name: string };
	onClick: ({ viewName, name }: { viewName: string; name: string }) => void;
	lang: Lang;
	defaultText?: string;
};

function VariableSelector({
	analyse,
	views,
	dict,
	variable,
	onClick,
	lang,
}: VariableSelectorProps) {
	return (
		views.length > 0 && (
			<div className="w-45 sm:w-55 md:w-62.5">
				<Dropdown
					removeAll={dict.analysebox.remove_choice}
					items={{
						groups: views.map((v) => ({
							groupLabel: v.title[lang],
							items: v.variables.map((variable) => ({
								label: variable[lang],
								value: `${v.name}.${variable.name}`,
							})),
						})),
					}}
					onChange={(e) => {
						const [viewName, name] =
							e.target.value === ""
								? ["total", analyse.name]
								: (e.target.value as string).split(".");
						onClick({ viewName, name });
					}}
					placeholder={dict.analysebox.choose_variable}
					value={
						variable.viewName === "total"
							? ""
							: (`${variable.viewName}.${variable.name}` as string)
					}
				/>
			</div>
		)
	);
}

type YearSelectorProps = {
	years: number[];
	lastYear: number;
	year: number;
	setYear: (year: number) => void;
	dict: { [k: string]: { [k: string]: string } };
	speed: number;
	className?: string;
};

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

function YearSelectorDropdown({
	years,
	year,
	setYear,
	dict,
	className,
}: YearSelectorProps) {
	return (
		<div className={className}>
			<Dropdown
				items={{
					groups: [
						{
							items: years
								.toReversed()
								.map((y) => ({ label: y.toString(), value: y.toString() })),
						},
					],
				}}
				onChange={(e) => setYear(Number(e.target.value))}
				placeholder={dict.analysebox.choose_year}
				value={year.toString()}
			/>
		</div>
	);
}

function YearSelectorSlider({
	years,
	lastYear,
	year,
	setYear,
	dict,
	speed,
	className,
}: YearSelectorProps) {
	const [animating, setAnimating] = React.useState(false);
	const animatingRef = React.useRef(false);
	React.useEffect(() => {
		animatingRef.current = animating;
	}, [animating]);

	return (
		<div className={className}>
			<Stack direction="row">
				<Box>
					{animating ? (
						<IconButton onClick={() => setAnimating(false)}>
							<PauseIcon />
						</IconButton>
					) : (
						<IconButton
							onClick={() => {
								setAnimating(true);
								let currentYear =
									lastYear === year ? Math.min(...years) - 1 : year;
								(function loop() {
									setTimeout(() => {
										if (currentYear < lastYear && animatingRef.current) {
											currentYear++;
											setYear(currentYear);
											loop();
										} else {
											setAnimating(false);
										}
									}, speed);
								})();
							}}
						>
							<PlayArrowIcon />
						</IconButton>
					)}
				</Box>
				<Box sx={{ flexGrow: 1, marginX: 2, marginRight: 4 }}>
					<Slider
						track={false}
						value={year}
						step={1}
						min={Math.min(...years)}
						max={lastYear}
						onChange={(_, value) => setYear(value as number)}
						valueLabelFormat={(value) =>
							value === lastYear + 1
								? dict.analysebox.all_years
								: value.toString()
						}
						valueLabelDisplay="auto"
						marks={years
							.map((year) => ({
								value: year as number,
								label: year.toString(),
							}))
							.concat({
								value: lastYear + 1,
								label: dict.analysebox.all_years,
							})}
						sx={{
							"@media (max-width: 600px)": {
								"& .MuiSlider-markLabel": {
									fontSize: "0.75rem",
								},
							},
						}}
					/>
				</Box>
			</Stack>
		</div>
	);
}

type ScreenshotBoxProps = {
	analyse: AnalyserPocMock;
	description: JSX.Element;
	graphRef: React.RefObject<HTMLDivElement | null>;
};

function ScreenshotBox({
	children,
	analyse,
	description,
	graphRef,
}: PropsWithChildren<ScreenshotBoxProps>) {
	return (
		<div className="px-0 md:px-8" ref={graphRef}>
			<Box
				sx={{
					width: "100%",
					height: "80vw",
					maxHeight: "700px",
					minHeight: "370px",
					marginTop: 0,
					position: "sticky",
				}}
			>
				<Box
					sx={{
						position: "absolute",
						right: 0,
						bottom: 0,
					}}
				>
					<Box
						component="img"
						alt={`{analyse.author} logo`}
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
							printColorAdjust: "exact",
							"@media print": { bottom: 110 },
						}}
					/>
				</Box>
				{children}
			</Box>
			<Box
				sx={{
					textAlign: "center",
					padding: 2,
					paddingBottom: 3,
					"@media print": { padding: 0, paddingBottom: 3 },
				}}
			>
				{description}
			</Box>
		</div>
	);
}

const MyTabList = styled(TabList)({
	["& .Mui-selected"]: { background: BACKGROUND_COLOR },
	["& .MuiButtonBase-root"]: {
		minHeight: "unset",
		height: 48,
		borderRadius: "8px 8px 0px 0px",
	},
	["& .MuiTabs-indicator"]: { display: "flex" },
});
export interface AnalyserPocMock {
	id: number;
	title: string;
	publiseringsStatus?: ("published" | "test" | "hidden") | null;
	publishedAt?: string | null;
	author: "SKDE" | "Helse Førde";
	norskType: "nb" | "nn";
	tags?: (number | Tag)[] | null;
	slug?: string | null;
	slugLock?: boolean | null;
	updatedAt: string;
	createdAt: string;
	_status?: ("draft" | "published") | null;
	data: {
		name: string;
		/**
		 * @minItems 2
		 * @maxItems 2
		 */
		age_range: [number, number];
		kjonn: "begge" | "menn" | "kvinner";
		kontakt_begrep?: {
			en: string;
			no: string;
		};
		kategori_begrep?: {
			en: string;
			no: string;
		};
		description: {
			en: string;
			no: string;
		};
		generated: number;
		views: {
			name: string;
			type: string;
			aggregering: "kont" | "pas" | "begge";
			/**
			 * @minItems 2
			 * @maxItems 2
			 */
			year_range: [number, number];
			title: {
				en: string;
				no: string;
			};
			/**
			 * @minItems 1
			 */
			variables: [
				{
					en: string;
					no: string;
					name: string;
				},
				...{
					en: string;
					no: string;
					name: string;
				}[],
			];
		}[];
		data: {
			/**
			 * This interface was referenced by `undefined`'s JSON-Schema definition
			 * via the `patternProperty` ".*".
			 */
			[k: string]: {
				/**
				 * This interface was referenced by `undefined`'s JSON-Schema definition
				 * via the `patternProperty` ".*".
				 */
				[k: string]: {
					/**
					 * This interface was referenced by `undefined`'s JSON-Schema definition
					 * via the `patternProperty` ".*".
					 */
					[k: string]: {
						/**
						 * This interface was referenced by `undefined`'s JSON-Schema definition
						 * via the `patternProperty` ".*".
						 */
						[k: string]: {
							/**
							 * This interface was referenced by `undefined`'s JSON-Schema definition
							 * via the `patternProperty` ".*".
							 */
							[k: string]: {
								/**
								 * This interface was referenced by `undefined`'s JSON-Schema definition
								 * via the `patternProperty` ".*".
								 */
								[k: string]: number;
							};
						};
					};
				};
			};
		};
		[k: string]: unknown;
	};
}
export type ChartContainerPocMockProps = {
	analyse: AnalyserPocMock;
	lang: Lang;
	dict: { [k: string]: { [k: string]: string } };
	nynorsk: boolean;
};

import analyseNewStructure from "./autisme-barn-new.json";
import analyseOrgStructure from "./autisme-barn-old.json";

export function ChartContainerPocMock({
	// analyse, note: use sample datastructur from file to be independent from parent component.
	lang,
	dict,
	nynorsk = false,
}: ChartContainerPocMockProps) {
	// New data-structure
	const analyseNew: AnalyserPocMock = {
		id: 1,
		title: "Autisme barn",
		author: "SKDE",
		norskType: "nn",
		updatedAt: "2024-06-01",
		createdAt: "2024-01-01",
		// @ts-expect-error
		data: analyseNewStructure,
	};
	// Original data-structure
	const analyseOrg: Analyser = {
		id: 1,
		name: "Autisme barn",
		author: "SKDE",
		norskType: "nn",
		updatedAt: "2024-06-01",
		createdAt: "2024-01-01",
		// @ts-expect-error
		data: analyseOrgStructure,
	};

	const analyse = analyseOrg; // Original data for original structure
	// const analyse = analyseNewFormat; // Data for Refactor to new structure

	const [showNorway, setShowNorway] = React.useState(false);
	const [verdiType, setVerdiType] = React.useState<"rate" | "n">("rate");

	const [level, setLevel] = React.useState<"region" | "sykehus">("sykehus");

	const aggregeringTypes = analyse.data.views.reduce(
		(prev, curr) =>
			prev.union(
				new Set(
					curr.aggregering === "begge"
						? ["kont", "pas"]
						: [curr.aggregering as "kont" | "pas"],
				),
			),
		new Set<"kont" | "pas">(),
	);

	const [aggregering, setAggregering] = React.useState<"kont" | "pas">(
		aggregeringTypes.size === 1
			? aggregeringTypes.values().next().value!
			: "kont",
	);
	const [mainTab, setMainTab] = React.useState<"analyse" | "demografi">(
		"analyse",
	);
	const [analyseTab, setAnalyseTab] = React.useState<"enkeltår" | "tidstrend">(
		"enkeltår",
	);
	const [allYears, setAllYears] = React.useState(true);

	const views = React.useMemo(
		() => Object.fromEntries(analyse.data.views.map((v) => [v.name, v])),
		[analyse],
	);

	const viewYears = React.useMemo(
		() =>
			Object.fromEntries(
				analyse.data.views.map((v) => {
					const year_range = v.year_range;
					return [
						v.name,
						Array.from(
							{ length: year_range[1] - year_range[0] + 1 },
							(_, i) => year_range[0] + i,
						),
					];
				}),
			),
		[analyse.data.views],
	);

	const [viewName, setViewName] = React.useState("total");
	const currentView = views[viewName];
	const focusViews = analyse.data.views.filter(
		(view) =>
			view.type === "standard" &&
			view.name !== "total" &&
			["begge", aggregering].includes(view.aggregering),
	);
	const analysisViewTab = viewName === "total" ? "analyse" : `view:${viewName}`;
	const activeMainTab = mainTab === "demografi" ? "demografi" : analysisViewTab;

	const [tidstrendVariable, setTidstrendVariable] = React.useState({
		viewName: "total",
		name: analyse.data.name,
	});
	const [demografiVariable, setDemografiVariable] = React.useState({
		viewName: "total",
		name: analyse.data.name,
	});

	const [showGenders, setShowGenders] = React.useState(true);
	const [demographyAndel, setDemographyAndel] = React.useState(false);

	const [selection, setSelection] = React.useState(
		new Selection({ region: new Set([]), sykehus: new Set([]) }),
	);

	const getYears = React.useCallback(
		(viewName: string) =>
			viewYears[viewName === "demografi" ? "total" : viewName],
		[viewYears],
	);

	const kategori = getCategory(analyse.data, nynorsk);

	const years = getYears(viewName);
	const lastYear = years.at(-1) as number;
	const [year, setYear] = React.useState<number>(lastYear);
	if (mainTab === "analyse" && !years.includes(year)) {
		// Ensuring current year is actually within the year range of the current view
		setYear(Math.max(Math.min(...years), Math.min(year, Math.max(...years))));
	}

	const demographyYears = getYears(demografiVariable.viewName);
	const demographyYear = demographyYears.includes(year)
		? year
		: Math.max(
				Math.min(...demographyYears),
				Math.min(year, Math.max(...demographyYears)),
			);

	const demographyAvailable = new Set(
		getYears("total").flatMap((year) =>
			Object.keys(analyse.data.data.demografi[year]),
		),
	).difference(new Set(["population"]));

	const maxValues = React.useMemo(() => {
		/* Calculates the max for all values accross years and areas (or other categories) */
		return Object.fromEntries(
			["demografi", ...analyse.data.views.map((v) => v.name)].map(
				(viewName) => {
					const view_years = getYears(viewName);
					const levels_or_views = Object.keys(
						analyse.data.data[viewName][view_years[0]],
					);
					return [
						viewName,
						Object.fromEntries(
							levels_or_views.map((level_or_view) => {
								const categories = Object.keys(
									analyse.data.data[viewName][view_years[0]][level_or_view],
								);
								const variables = Object.keys(
									analyse.data.data[viewName][view_years[0]][level_or_view][
										categories[0]
									],
								);
								const inflections = Object.keys(
									analyse.data.data[viewName][view_years[0]][level_or_view][
										categories[0]
									][variables[0]],
								);
								return [
									level_or_view,
									Object.fromEntries(
										variables.map((variable) => {
											return [
												variable,
												Object.fromEntries(
													inflections.map((inflection) => [
														inflection,
														{
															all: Math.max(
																...view_years.flatMap((year) =>
																	categories.map(
																		(category) =>
																			analyse.data.data[viewName][year][
																				level_or_view
																			][category][variable][inflection],
																	),
																),
															),
															withoutNorway: Math.max(
																...view_years.flatMap((year) =>
																	categories
																		.filter((c) => c !== "Norge")
																		.map(
																			(category) =>
																				analyse.data.data[viewName][year][
																					level_or_view
																				][category][variable][inflection],
																		),
																),
															),
														},
													]),
												),
											];
										}),
									),
								];
							}),
						),
					];
				},
			),
		);
	}, [analyse, getYears]);

	const varNames = React.useMemo(
		() =>
			Object.fromEntries(
				analyse.data.views.flatMap((view) =>
					view.variables.map((variable) => [variable.name, variable]),
				),
			),
		[analyse],
	);

	const chooseAreasText =
		dict.analysebox.choose_area +
		(selection[level].size ? ` (${selection[level].size})` : "");

	const areaAndAggregationSelect = (
		<div className="flex flex-wrap gap-4 px-4 sm:px-8 mb-4">
			Buttons:
			<div className="w-45 sm:w-55 md:w-62.5">
				<Dropdown
					multiple
					removeAll={dict.analysebox.remove_choice}
					items={{
						groups:
							level === "region"
								? [
										{
											items: Object.keys(hospitalStructure).map((region) => ({
												label: getAreaName(region, lang, nynorsk),
												value: region,
											})),
										},
									]
								: Object.keys(hospitalStructure).map((region) => ({
										groupLabel: getAreaName(region, lang, nynorsk),
										items: Array.from(hospitalStructure[region])
											.toSorted()
											.map((sykehus) => ({
												label: getAreaName(sykehus, lang, nynorsk),
												value: sykehus,
											})),
									})),
					}}
					onChange={(e) => {
						if (e.target.value.length === 0) {
							setSelection(
								new Selection({ region: new Set([]), sykehus: new Set([]) }),
							);
						} else {
							const SelectedValue = Array.from(
								new Set(e.target.value).symmetricDifference(selection[level]),
							)[0];
							setSelection(
								level === "region"
									? selection.toggleRegion(SelectedValue)
									: selection.toggleSykehus(SelectedValue),
							);
						}
					}}
					placeholder={chooseAreasText}
					value={Array.from(selection[level])}
				/>
			</div>
			<ToggleButtonGroup
				exclusive
				onChange={() => setLevel(level === "sykehus" ? "region" : "sykehus")}
				orientation="horizontal"
				value={[level]}
			>
				<ToggleButton fullWidth value="sykehus">
					{dict.analysebox.sykehus}
				</ToggleButton>
				<ToggleButton fullWidth value="region">
					{dict.analysebox.region}
				</ToggleButton>
			</ToggleButtonGroup>
			{aggregeringTypes.size === 2 && (
				<ToggleButtonGroup
					value={[aggregering]}
					exclusive
					onChange={() => {
						const newAggregering = aggregering === "kont" ? "pas" : "kont";
						setAggregering(newAggregering);
						if (!["begge", newAggregering].includes(currentView.aggregering)) {
							setViewName("total");
						}
						if (
							!["begge", newAggregering].includes(
								views[tidstrendVariable.viewName].aggregering,
							)
						) {
							setTidstrendVariable({
								viewName: "total",
								name: analyse.data.name,
							});
						}
					}}
				>
					<ToggleButton value="kont" fullWidth>
						{analyse.data.kontakt_begrep
							? capitalize(analyse.data.kontakt_begrep[lang])
							: dict.analysebox.kontakter}
					</ToggleButton>
					<ToggleButton value="pas" fullWidth>
						{dict.analysebox.pasienter}
					</ToggleButton>
				</ToggleButtonGroup>
			)}
			<ToggleButtonGroup
				value={[verdiType]}
				exclusive
				onChange={() => setVerdiType(verdiType === "rate" ? "n" : "rate")}
			>
				<ToggleButton value={"rate"} fullWidth>
					Rate
				</ToggleButton>
				<ToggleButton value={"n"} fullWidth>
					{dict.analysebox.antall}
				</ToggleButton>
			</ToggleButtonGroup>
		</div>
	);

	const [openSnackbar, setOpenSnackbar] = React.useState(false);
	const graphRef = React.useRef<null | HTMLDivElement>(null);

	const lastNed = (
		<SplitButton
			label={dict.analysebox.download}
			onClick={async (option) => {
				switch (option) {
					case dict.analysebox.copy_graph:
						if (graphRef.current) {
							await snapdom
								.toBlob(graphRef.current, { type: "png" })
								.then((blob) => {
									blob &&
										navigator.clipboard.write([
											new ClipboardItem({ [blob.type]: blob }),
										]);
								})
								.then(() => setOpenSnackbar(true));
						}
						break;
					case dict.analysebox.download_graph:
						if (graphRef.current) {
							const result = await snapdom(graphRef.current);
							await result.download({
								format: "png",
								backgroundColor: "white",
								filename:
									mainTab === "demografi"
										? `${analyse.data.name}_demografi.png`
										: analyseTab === "enkeltår"
											? `${analyse.data.name}_${currentView.title[lang].toLowerCase().replace(" ", "_")}_${year}.png`
											: `${analyse.data.name}_tidstrend.png`,
							});
						}
						break;
					case dict.analysebox.download_data:
						downloadJSON(analyse.data);
						break;
				}
			}}
			options={[
				dict.analysebox.copy_graph,
				dict.analysebox.download_graph,
				dict.analysebox.download_data,
			]}
			steps="one-step"
		/>
	);

	return (
		<Box sx={{ width: "100%", typography: "body1" }}>
			Debug data objects:
			<br />
			<div className="flex gap-4 bg-neutral-200 justify-between mb-8">
				<JSONTree
					data={{ demografiVariable, selection, tidstrendVariable }}
					theme={jsonTreeTheme}
					invertTheme={false}
					hideRoot={true}
				/>
				<JSONTree
					data={analyse}
					theme={jsonTreeTheme}
					invertTheme={false}
					hideRoot={true}
				/>
			</div>
			Debug state variables:
			<div className="flex flex-wrap gap-4 p-10 border bg-neutral-200 mb-8">
				<div className="font-bold">år:</div>
				<div>{year || "-"};</div>
				<div className="font-bold">demografi:</div>
				<div> {demographyAndel ? "yes" : "no"};</div>
				<div className="font-bold">show genders:</div>
				<div> {showGenders ? "yes" : "no"};</div>
				<div className="font-bold">view:</div>
				<div>{viewName || "-"};</div>
				<div className="font-bold">all years:</div>
				<div>{allYears ? "yes" : "no"};</div>
				<div className="font-bold">analyse tab:</div>
				<div>{analyseTab || "-"};</div>
				<div className="font-bold">main tab:</div>
				<div>{mainTab || "-"};</div>
				<div className="font-bold">level:</div>
				<div>{level || "-"};</div>
				<div className="font-bold">verdi type:</div>
				<div>{verdiType || "-"};</div>
				<div className="font-bold">show Norway:</div>
				<div>{showNorway ? "yes" : "no"};</div>
			</div>
			<TabContext value={activeMainTab}>
				<MyTabList
					onChange={(_, value: string) => {
						if (value === "demografi") {
							setMainTab("demografi");
						} else {
							setMainTab("analyse");
							setViewName(value === "analyse" ? "total" : value.slice(5));
						}
					}}
					aria-label="Type datavisning"
					variant="scrollable"
					scrollButtons="auto"
				>
					<Tab
						icon={<AssessmentIcon fontSize="small" />}
						iconPosition="start"
						label="Analyse"
						value="analyse"
						sx={{ textTransform: "none" }}
					/>
					<Tab
						icon={<GroupsIcon fontSize="small" />}
						iconPosition="start"
						label={dict.analysebox.demography}
						value="demografi"
						sx={{ textTransform: "none" }}
					/>
					{focusViews.map((view) => (
						<Tab
							icon={
								// TODO: Replace with mapping function based on view.name to select appropriate icon
								view.name === "behandler" ? (
									<DomainAddIcon fontSize="small" />
								) : (
									<MedicalInformationIcon fontSize="small" />
								)
							}
							iconPosition="start"
							key={view.name}
							label={view.title[lang]}
							value={`view:${view.name}`}
							sx={{ textTransform: "none" }}
						/>
					))}
				</MyTabList>
				<Paper
					sx={{ background: BACKGROUND_COLOR, borderRadius: "0px 0px 8px 8px" }}
					elevation={2}
				>
					{/* Analyse tab */}
					<TabPanel
						value={analysisViewTab}
						sx={{ paddingX: 0, paddingBottom: 0 }}
					>
						{areaAndAggregationSelect}
						<TabContext value={analyseTab}>
							<Box
								sx={{ borderBottom: 1, borderColor: "divider" }}
								className="mx-4 sm:mx-8"
							>
								<MyTabList
									onChange={(_, value) => {
										setAnalyseTab(value);
									}}
									aria-label="Type datavisning"
								>
									<Tab
										icon={<BarChartIcon fontSize="small" />}
										iconPosition="start"
										label={dict.analysebox.single_year}
										value="enkeltår"
										sx={{ textTransform: "none" }}
									/>
									<Tab
										icon={<InsightsIcon fontSize="small" />}
										iconPosition="start"
										label={dict.analysebox.time_series}
										value="tidstrend"
										sx={{ textTransform: "none" }}
									/>
								</MyTabList>
							</Box>
							<TabPanel value="enkeltår" sx={{ paddingX: 0, paddingBottom: 0 }}>
								<div className="px-4 sm:px-8">
									<div className="flex gap-4">
										<div className="flex flex-wrap gap-4 gap-y-2 mb-4">
											<YearSelectorDropdown
												years={years}
												lastYear={lastYear}
												year={year}
												setYear={setYear}
												dict={dict}
												speed={600}
												className="block sm:hidden"
											/>
										</div>
										<div className="ml-auto shrink-0">{lastNed}</div>
									</div>
									<YearSelectorSlider
										years={years}
										lastYear={lastYear}
										year={year}
										setYear={setYear}
										dict={dict}
										speed={600}
										className="hidden sm:block"
									/>
								</div>
								<div className="p-4 border bg-neutral-100 text-center ">
									Graph goes here
								</div>
								{/* <div>
									<ScreenshotBox
										graphRef={graphRef}
										analyse={analyse}
										description={getDescription(
											analyse.data,
											lang,
											verdiType,
											aggregering,
											undefined,
											nynorsk,
										)}
									>
										<AnalyseBarChart
											categories={Object.keys(
												analyse.data.data[viewName][lastYear][level],
											).filter(
												(cat) => cat !== "Norge" || verdiType === "rate",
											)}
											variables={currentView.variables.map(
												(variable) => variable.name,
											)}
											valueGetter={(category, variable) =>
												analyse.data.data[viewName][year][level][category][
													variable
												][`${aggregering}_${verdiType}`]
											}
											variableFmt={(variable) => varNames[variable][lang]}
											categoryFmt={(category) =>
												getAreaName(category, lang, nynorsk)
											}
											valueAxisFmt={(v) =>
												new Intl.NumberFormat(lang).format(v)
											}
											valueFmt={(v) =>
												formatNumber(
													v || 0,
													lang,
													verdiType === "n" && aggregering === "pas"
														? { maximumFractionDigits: 0 }
														: undefined,
												)
											}
											special_values={new Set(["Norge"])}
											selection={
												level === "region"
													? selection.region
													: selection.sykehus
											}
											onClick={(area) =>
												area !== "Norge" &&
												setSelection(
													level === "region"
														? selection.toggleRegion(area)
														: selection.toggleSykehus(area),
												)
											}
											maxValue={
												maxValues["total"][level][analyse.data.name][
													`${aggregering}_${verdiType}`
												].withoutNorway
											}
										/>
									</ScreenshotBox>
								</div> */}
							</TabPanel>
							<TabPanel
								value="tidstrend"
								sx={{ paddingX: 0, paddingBottom: 0 }}
							>
								<div className="flex gap-4 px-4 sm:px-8">
									<div className="flex flex-row gap-4 flex-wrap">
										<VariableSelector
											analyse={analyse.data}
											views={analyse.data.views
												.filter((v) =>
													["begge", aggregering].includes(v.aggregering),
												)
												.slice(1)}
											dict={dict}
											lang={lang}
											variable={tidstrendVariable}
											onClick={(v) => setTidstrendVariable(v)}
										/>
										{verdiType === "n" && (
											<FormControlLabel
												control={
													<Switch
														checked={showNorway}
														onChange={() => setShowNorway(!showNorway)}
													/>
												}
												label={
													<Typography
														variant="body2"
														sx={{ display: "inline" }}
													>
														{dict.analysebox.show_norway}
													</Typography>
												}
											/>
										)}
									</div>
									<div className="ml-auto shrink-0">{lastNed}</div>
								</div>
								<ScreenshotBox
									analyse={analyse}
									description={getDescription(
										analyse.data,
										lang,
										verdiType,
										aggregering,
										tidstrendVariable.name !== analyse.data.name
											? tidstrendVariable
											: undefined,
										nynorsk,
									)}
									graphRef={graphRef}
								>
									<AnalyseLineChart
										analyse={analyse.data}
										years={viewYears[tidstrendVariable.viewName]}
										level={level}
										categoryFmt={(category) =>
											getAreaName(category, lang, nynorsk)
										}
										valueFmt={(v) =>
											formatNumber(
												v || 0,
												lang,
												verdiType === "n" && aggregering === "pas"
													? { maximumFractionDigits: 0 }
													: undefined,
											)
										}
										inflection={`${aggregering}_${verdiType}`}
										variable={tidstrendVariable}
										showNorway={verdiType === "rate" || showNorway}
										selection={selection}
										lang={lang}
										maxValue={
											maxValues[tidstrendVariable.viewName][level][
												tidstrendVariable.name
											][`${aggregering}_${verdiType}`][
												showNorway ? "all" : "withoutNorway"
											]
										}
									/>
								</ScreenshotBox>
							</TabPanel>
						</TabContext>
					</TabPanel>

					{/* Demografi tab */}
					<TabPanel value="demografi" sx={{ paddingX: 0, paddingBottom: 0 }}>
						<div className="px-4 sm:px-8">
							<div className="flex gap-4">
								<div className="flex flex-wrap gap-4 mb-4">
									{analyse.data.kjonn === "begge" && (
										<ToggleButtonGroup
											value={[showGenders]}
											exclusive
											onChange={() => setShowGenders(!showGenders)}
											disabled={analyse.data.kjonn !== "begge"}
										>
											<ToggleButton value={false}>
												{dict.analysebox.alle}
											</ToggleButton>
											<ToggleButton value={true}>
												{dict.analysebox.demography_split_gender}
											</ToggleButton>
										</ToggleButtonGroup>
									)}
									<ToggleButtonGroup
										value={[demographyAndel]}
										exclusive
										onChange={() => setDemographyAndel(!demographyAndel)}
									>
										<ToggleButton value={false}>
											{dict.analysebox.antall}
										</ToggleButton>
										<ToggleButton value={true}>
											{dict.analysebox.andel}
										</ToggleButton>
									</ToggleButtonGroup>
									<VariableSelector
										analyse={analyse.data}
										views={analyse.data.views
											.slice(1)
											.filter((v) => demographyAvailable.has(v.name))}
										dict={dict}
										lang={lang}
										variable={demografiVariable}
										onClick={(v) => setDemografiVariable(v)}
									/>
									<ToggleButtonGroup
										value={allYears}
										exclusive
										onChange={() => setAllYears(!allYears)}
									>
										<ToggleButton value={true}>
											{dict.analysebox.all_years}
										</ToggleButton>
										<ToggleButton value={false}>
											{dict.analysebox.choose_year}
										</ToggleButton>
									</ToggleButtonGroup>
									{!allYears && (
										<YearSelectorDropdown
											className="block sm:hidden"
											years={demographyYears}
											lastYear={demographyYears.at(-1) as number}
											year={demographyYear}
											setYear={setYear}
											dict={dict}
											speed={1000}
										/>
									)}
								</div>
								<div className="ml-auto shrink-0">{lastNed}</div>
							</div>
							{!allYears && (
								<YearSelectorSlider
									years={demographyYears}
									lastYear={demographyYears.at(-1) as number}
									year={demographyYear}
									setYear={setYear}
									dict={dict}
									speed={600}
									className="hidden sm:block"
								/>
							)}
						</div>
						<ScreenshotBox
							graphRef={graphRef}
							analyse={analyse}
							description={
								<Typography variant="body2">
									{demographyAndel
										? `${dict.analysebox.andel} ${lang === "en" ? "of" : "av"} ${dict.analysebox[analyse.data.kjonn === "begge" && showGenders ? "gender_age_group" : "age_group"]}`
										: `${dict.analysebox.antall}${{ en: " of", no: "" }[lang]} ${kategori.special ? kategori[lang] : dict.analysebox.people} ${{ en: "in", no: "i" }[lang]} ${dict.analysebox[analyse.data.kjonn === "begge" && showGenders ? "gender_age_group" : "age_group"]}`}
									{demografiVariable.name !== analyse.data.name &&
										getVariableText(analyse.data, lang, demografiVariable)}
								</Typography>
							}
						>
							<AnalyseDemography
								analyse={analyse.data}
								showGenders={showGenders}
								variable={demografiVariable}
								andel={demographyAndel}
								lang={lang}
								year={allYears ? "all_years" : demographyYear}
								years={demographyYears}
							/>
						</ScreenshotBox>
					</TabPanel>
				</Paper>
			</TabContext>
			<Snackbar
				open={openSnackbar}
				autoHideDuration={4000}
				onClose={() => setOpenSnackbar(false)}
				slots={{ transition: Slide }}
				message={dict.analysebox.copy_graph_snackbar_message}
				anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
				action={
					<IconButton
						size="small"
						aria-label="close"
						color="inherit"
						onClick={() => setOpenSnackbar(false)}
					>
						<CloseIcon fontSize="small" />
					</IconButton>
				}
			/>
		</Box>
	);
}
