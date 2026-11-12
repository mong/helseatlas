import { Dropdown, ToggleButton, ToggleButtonGroup } from "@mong/material-ui";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Box, IconButton, Slider, Stack } from "@mui/material";
import React from "react";
import type { ChartContainerPocMockProps } from "@/app/(frontend)/[lang]/ny-datastruktur/ChartContainerPocMock";
import type { Lang } from "@/types";
import {
	type AnalysisData,
	type DimensionValues,
	getEnumDimensions,
	type Variable,
	type View,
} from "./chartData";

type YearSelectorProps = {
	years: number[];
	year: number;
	setYear: (year: number) => void;
	dict: ChartContainerPocMockProps["dict"];
	lang: Lang;
};

export function YearSelector({
	years,
	year,
	setYear,
	dict,
	lang,
}: YearSelectorProps) {
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

export function DimensionControls({
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
				key={dimension.id}
				value={values[dimension.id]}
				exclusive
				aria-label={dimension.label?.[lang] ?? dimension.id}
				onChange={(_, value: string | null) => {
					if (value !== null) onChange({ ...values, [dimension.id]: value });
				}}
			>
				{dimension.values?.map((value) => (
					<ToggleButton key={value.id} value={value.id} className="w-30">
						{value.label[lang]}
					</ToggleButton>
				))}
			</ToggleButtonGroup>
		));
}

type VariableSelectorProps = {
	variables: Variable[];
	lang: Lang;
	placeholder: string;
	value: string;
	onChange: NonNullable<React.ComponentProps<typeof Dropdown>["onChange"]>;
};

export function VariableSelector({
	variables,
	lang,
	placeholder,
	value,
	onChange,
}: VariableSelectorProps) {
	return (
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
				placeholder={placeholder}
				value={value}
				onChange={onChange}
			/>
		</div>
	);
}
