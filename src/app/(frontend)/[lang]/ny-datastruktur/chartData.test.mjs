import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
	getBarRows,
	getCategoryType,
	getDemographyRows,
	getDimensionValues,
	getTrendRows,
	getValue,
	getView,
	getYears,
} from "./chartData.ts";

const data = JSON.parse(readFileSync(new URL("./autisme-barn-new.json", import.meta.url)));
const legacy = JSON.parse(readFileSync(new URL("./autisme-barn-old.json", import.meta.url)));
const total = getView(data, "total");
const demography = getView(data, "demografi");
const filters = {
	rate_eller_antall: "rate",
	pasienter_eller_kontaktdager: "pasienter",
};

test("every geographic observation retains its exact legacy value", () => {
	let compared = 0;
	for (const view of data.views.filter((view) => view.id !== "demografi")) {
		const oldView = legacy.views.find((old) => old.name.toLowerCase() === view.id);
		assert.ok(oldView);
		for (const typeId of view.categoryTypes) {
			for (const category of getCategoryType(data, typeId).categories) {
				for (const row of data.observations[view.id][typeId][category.id]) {
					const inflection = `${row.pasienter_eller_kontaktdager === "pasienter" ? "pas" : "kont"}_${row.rate_eller_antall === "rate" ? "rate" : "n"}`;
					for (const variable of view.variables) {
						const oldVariable = oldView.variables.find((old) => old.no === variable.label.no);
						assert.ok(oldVariable);
						const actual = getValue(data, view.id, typeId, category.id, variable.id, {
							year: row.year,
							rate_eller_antall: row.rate_eller_antall,
							pasienter_eller_kontaktdager: row.pasienter_eller_kontaktdager,
						});
						assert.equal(actual, legacy.data[oldView.name][row.year][typeId][category.label.no][oldVariable.name][inflection]);
						compared++;
					}
				}
			}
		}
	}
	assert.equal(compared, 4536);
});

test("every demographic observation retains its exact legacy value", () => {
	let compared = 0;
	for (const category of getCategoryType(data, "alder").categories) {
		for (const row of data.observations.demografi.alder[category.id]) {
			for (const variable of demography.variables) {
				const oldView = variable.id === "population" ? "population"
					: variable.id === "autisme_barn" ? "total" : "somatikk_ikke_s04E6";
				assert.equal(
					getValue(data, "demografi", "alder", category.id, variable.id, { year: row.year, kjonn: row.kjonn }),
					legacy.data.demografi[row.year][oldView][category.label.no][variable.id][row.kjonn],
				);
				compared++;
			}
		}
	}
	assert.equal(compared, 1008);
});

test("dimension defaults, explicit selections, and invalid values", () => {
	assert.deepEqual(getDimensionValues(data, total, {}), filters);
	assert.deepEqual(getDimensionValues(data, total, {
		...filters, pasienter_eller_kontaktdager: "kontaktdager",
	}), { ...filters, pasienter_eller_kontaktdager: "kontaktdager" });
	assert.throws(() => getDimensionValues(data, total, { rate_eller_antall: "unknown" }), /Invalid value/);
	assert.throws(() => getView(data, "unknown"), /Unknown view/);
	assert.throws(() => getCategoryType(data, "unknown"), /Unknown category type/);
});

test("bar rows use all variables and preserve zero observations", () => {
	const view = getView(data, "behandler");
	const rows = getBarRows(data, view, "region", { ...filters, year: 2019 });
	const national = rows.find((row) => row.category === "norge");
	assert.deepEqual(Object.keys(national.values), view.variables.map((variable) => variable.id));
	assert.equal(national.sum, Object.values(national.values).reduce((sum, value) => sum + value, 0));
	assert.equal(getValue(data, "demografi", "alder", "age-0", "autisme_barn", {
		year: 2019, kjonn: "menn",
	}), 0);
});

test("time series responds to category, variable, aggregation, and measure", () => {
	for (const view of data.views.filter((view) => view.id !== "demografi")) {
		for (const categoryType of view.categoryTypes) {
			for (const variable of view.variables) {
				for (const measure of ["rate", "antall"]) {
					for (const aggregation of ["pasienter", "kontaktdager"]) {
						const dimensions = { rate_eller_antall: measure, pasienter_eller_kontaktdager: aggregation };
						const rows = getTrendRows(data, view, categoryType, variable.id, dimensions);
						assert.deepEqual(rows.map((row) => row.year), getYears(data, view.id));
						for (const row of rows) {
							for (const [category, value] of Object.entries(row.values)) {
								assert.equal(value, getValue(data, view.id, categoryType, category, variable.id, {
									...dimensions, year: row.year,
								}));
							}
						}
					}
				}
			}
		}
	}
});

test("demography averages counts, weights proportions, and combines genders", () => {
	const years = getYears(data, demography.id);
	for (const variable of demography.variables.filter((variable) => variable.id !== "population")) {
		for (const selectedYears of [[years[0]], years]) {
			for (const split of [true, false]) {
				for (const proportion of [true, false]) {
					const rows = getDemographyRows(data, demography, variable.id, selectedYears, {}, split, proportion);
					for (const row of rows) {
						for (const [series, actual] of Object.entries(row.values)) {
							const genders = series === "combined" ? ["menn", "kvinner"] : [series];
							let count = 0;
							let population = 0;
							for (const year of selectedYears) {
								for (const gender of genders) {
									const filters = { year, kjonn: gender };
									count += getValue(data, demography.id, "alder", row.category, variable.id, filters);
									population += getValue(data, demography.id, "alder", row.category, "population", filters);
								}
							}
							assert.equal(actual, proportion ? count / population : count / selectedYears.length);
						}
					}
				}
			}
		}
	}
});

test("missing and zero-population observations are gaps, not fabricated zeros", () => {
	const modified = structuredClone(data);
	const row = modified.observations.demografi.alder["age-0"][0];
	row.variables.population = 0;
	assert.equal(getDemographyRows(modified, demography, "autisme_barn", [2019], {}, true, true)[0].values.menn, null);
	assert.equal(getValue(data, "total", "sykehus", "missing", "autisme_barn", { ...filters, year: 2019 }), null);
	delete row.variables.autisme_barn;
	assert.equal(getDemographyRows(modified, demography, "autisme_barn", [2019], {}, true, false)[0].values.menn, null);
	const trendRow = modified.observations.total.sykehus.ous[0];
	delete trendRow.variables.autisme_barn;
	assert.equal(getTrendRows(modified, total, "sykehus", "autisme_barn", {
		rate_eller_antall: "antall", pasienter_eller_kontaktdager: "pasienter",
	})[0].values.ous, null);
	assert.throws(() => getBarRows(modified, total, "sykehus", {
		year: 2019, rate_eller_antall: "antall", pasienter_eller_kontaktdager: "pasienter",
	}), /Missing observation/);
});

test("duplicate observations and non-finite values fail explicitly", () => {
	const modified = structuredClone(data);
	const rows = modified.observations.total.region.norge;
	rows.push(structuredClone(rows[0]));
	assert.throws(() => getValue(modified, "total", "region", "norge", "autisme_barn", {
		year: rows[0].year, rate_eller_antall: rows[0].rate_eller_antall,
		pasienter_eller_kontaktdager: rows[0].pasienter_eller_kontaktdager,
	}), /Ambiguous/);
	rows.pop();
	rows[0].variables.autisme_barn = Number.NaN;
	assert.throws(() => getValue(modified, "total", "region", "norge", "autisme_barn", {
		year: rows[0].year, rate_eller_antall: rows[0].rate_eller_antall,
		pasienter_eller_kontaktdager: rows[0].pasienter_eller_kontaktdager,
	}), /Invalid observation/);
});

test("years come from actual observations, including non-contiguous years", () => {
	const modified = structuredClone(data);
	for (const categories of Object.values(modified.observations.total)) {
		for (const [category, rows] of Object.entries(categories)) {
			categories[category] = rows.filter((row) => [2019, 2025].includes(row.year));
		}
	}
	assert.deepEqual(getYears(modified, "total"), [2019, 2025]);
	assert.throws(() => getYears(modified, "missing"), /Missing observations/);
});
