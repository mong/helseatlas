export type Label = { no: string; en: string };
export type DimensionValues = Record<string, string | number>;
export type Variable = { id: string; label: Label };
export type Category = Variable & {
	parent?: { categoryType: string; category: string };
};
export type CategoryType = Variable & { categories: Category[] };
export type Dimension = {
	id: string;
	type: string;
	label?: Label;
	default?: string | number;
	range?: number[];
	values?: Variable[];
};
export type View = Variable & {
	type: string;
	categoryTypes: string[];
	dimensions: { dimensionId: string }[];
	variables: Variable[];
};
export type Observation = {
	year: number;
	variables: Record<string, number>;
	[dimensionId: string]: string | number | Record<string, number>;
};
export type AnalysisData = {
	categoryTypes: CategoryType[];
	views: View[];
	dimensions: Dimension[];
	observations: Record<string, Record<string, Record<string, Observation[]>>>;
};

export function getView(data: AnalysisData, id: string): View {
	const view = data.views.find((view) => view.id === id);
	if (!view) throw new Error(`Unknown view: ${id}`);
	return view;
}

export function getCategoryType(data: AnalysisData, id: string): CategoryType {
	const categoryType = data.categoryTypes.find((type) => type.id === id);
	if (!categoryType) throw new Error(`Unknown category type: ${id}`);
	return categoryType;
}

export function getDimension(data: AnalysisData, id: string): Dimension {
	const dimension = data.dimensions.find((dimension) => dimension.id === id);
	if (!dimension) throw new Error(`Unknown dimension: ${id}`);
	return dimension;
}

export function getEnumDimensions(data: AnalysisData, view: View): Dimension[] {
	return view.dimensions
		.map(({ dimensionId }) => getDimension(data, dimensionId))
		.filter((dimension) => dimension.type === "enum");
}

export function getDimensionValues(
	data: AnalysisData,
	view: View,
	selected: DimensionValues,
): DimensionValues {
	return Object.fromEntries(
		getEnumDimensions(data, view).map((dimension) => {
			const values = dimension.values;
			if (!values?.length)
				throw new Error(`Dimension ${dimension.id} has no values`);
			const value = selected[dimension.id] ?? dimension.default ?? values[0].id;
			if (!values.some((option) => option.id === value))
				throw new Error(`Invalid value for dimension ${dimension.id}: ${value}`);
			return [dimension.id, value];
		}),
	);
}

export function getYears(data: AnalysisData, viewId: string): number[] {
	const observations = data.observations[viewId];
	if (!observations) throw new Error(`Missing observations for view: ${viewId}`);
	const years = [...new Set(
		Object.values(observations).flatMap((categories) =>
			Object.values(categories).flatMap((rows) => rows.map((row) => row.year)),
		),
	)].sort((a, b) => a - b);
	if (!years.length) throw new Error(`View ${viewId} has no observation years`);
	return years;
}

export function getValue(
	data: AnalysisData,
	viewId: string,
	categoryType: string,
	category: string,
	variable: string,
	dimensions: DimensionValues,
): number | null {
	const rows = data.observations[viewId]?.[categoryType]?.[category];
	if (!rows) return null;
	const matches = rows.filter((row) =>
		Object.entries(dimensions).every(([id, value]) => row[id] === value),
	);
	if (matches.length > 1)
		throw new Error(`Ambiguous observations: ${viewId}/${categoryType}/${category}`);
	if (matches.length === 0) return null;
	const value = matches[0].variables[variable];
	if (value === undefined) return null;
	if (!Number.isFinite(value))
		throw new Error(`Invalid observation: ${viewId}/${category}/${variable}`);
	return value;
}

export function getBarRows(
	data: AnalysisData,
	view: View,
	categoryType: string,
	dimensions: DimensionValues,
): { category: string; values: Record<string, number>; sum: number }[] {
	return getCategoryType(data, categoryType).categories.map((category) => {
		const values = Object.fromEntries(view.variables.map((variable) => {
			const value = getValue(data, view.id, categoryType, category.id, variable.id, dimensions);
			if (value === null)
				throw new Error(`Missing observation: ${view.id}/${category.id}/${variable.id}`);
			return [variable.id, value];
		}));
		return {
			category: category.id,
			values,
			sum: Object.values(values).reduce((total, value) => total + value, 0),
		};
	});
}

export function getTrendRows(
	data: AnalysisData,
	view: View,
	categoryType: string,
	variable: string,
	dimensions: DimensionValues,
): { year: number; values: Record<string, number | null> }[] {
	return getYears(data, view.id).map((year) => ({
		year,
		values: Object.fromEntries(
			getCategoryType(data, categoryType).categories.map((category) => [
				category.id,
				getValue(data, view.id, categoryType, category.id, variable, { ...dimensions, year }),
			]),
		),
	}));
}

export function getDemographyRows(
	data: AnalysisData,
	view: View,
	variable: string,
	years: number[],
	dimensions: DimensionValues,
	showGenders: boolean,
	proportion: boolean,
): { category: string; values: Record<string, number | null> }[] {
	if (!years.length) throw new Error("Demography requires at least one year");
	const genders = getDimension(data, "kjonn").values;
	if (!genders?.length) throw new Error("Demography requires gender values");
	const categoryType = view.categoryTypes[0];
	if (!categoryType) throw new Error("Demography requires a category type");
	const series = showGenders
		? genders.map((gender) => ({ id: gender.id, genders: [gender.id] }))
		: [{ id: "combined", genders: genders.map((gender) => gender.id) }];

	return getCategoryType(data, categoryType).categories.map((category) => ({
		category: category.id,
		values: Object.fromEntries(series.map((series) => {
			let count = 0;
			let population = 0;
			for (const year of years) {
				for (const gender of series.genders) {
					const filters = { ...dimensions, year, kjonn: gender };
					const value = getValue(data, view.id, categoryType, category.id, variable, filters);
					const denominator = proportion
						? getValue(data, view.id, categoryType, category.id, "population", filters)
						: 0;
					if (value === null || denominator === null) return [series.id, null];
					count += value;
					population += denominator;
				}
			}
			return [
				series.id,
				proportion ? (population > 0 ? count / population : null) : count / years.length,
			];
		})),
	}));
}
