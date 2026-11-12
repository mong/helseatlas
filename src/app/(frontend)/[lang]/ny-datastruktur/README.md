# New data structure: implementation guide

This folder contains a **proof of concept**, not a replacement for the production
analysis page. It demonstrates how the app can render charts directly from a
data structure that separates labels, categories, dimensions, and observations.

Open `/no/ny-datastruktur` after starting the app using the
[local development instructions](../../../../../README.md#kjør-lokalt).
The page includes expandable examples of both data structures, and the chart
component has a **State** panel for inspecting the current selection.

## What changed for users?

- Focus areas such as **Behandler** and **Sektor** are now top-level tabs instead
  of options in the **Fokusområde** dropdown.
- Each geographic tab offers **Enkeltår** (stacked bars) and **Tidstrend** (lines).
  The selected time-series variable belongs to the active tab.
- Area types, areas, variables, and enum-dimension choices come from the new
  data file. Area selection is currently flat, without region/hospital grouping
  or automatic selection of a region's hospitals.
- **Demografi** has its own data view, with variable, gender split, count/share,
  and single-year/all-years controls.
- Available years come from observations. The desktop slider and playback, and
  the mobile dropdown, only offer those years.
- Data download exports the complete new dataset, not just the visible chart or
  the old format. PNG download and copying the chart remain available.

## Scope and files

| File | Responsibility |
| --- | --- |
| [page.tsx](./page.tsx) | Loads the example JSON, supplies analysis metadata and language/dictionary props, and displays the comparison page. |
| [ChartContainerPocMock.tsx](./ChartContainerPocMock.tsx) | Owns selection state, renders controls and charts, and handles exports and notifications. |
| [chartData.ts](./chartData.ts) | Defines the new TypeScript types and pure functions for observation lookup and chart datasets. |
| [chartData.test.mjs](./chartData.test.mjs) | Checks numeric parity with the old fixture and calculation/error-handling behavior. |
| [autisme-barn-new.json](./autisme-barn-new.json) | Source of truth for the prototype's chart data. |
| [autisme-barn-old.json](./autisme-barn-old.json) | Reference for the comparison page and regression tests; not an input to the new charts. |

There is **no adapter that converts the new data back into the old structure**.
The prototype reuses the data-format-independent
[AnalyseBarChart](../../../../components/Charts/AnalyseBarChart.tsx), passing
categories, variables, and a value getter. Time series and demography use MUI
`LineChart` directly rather than the legacy
[AnalyseLineChart](../../../../components/Charts/AnalyseLineChart.tsx) and
[AnalyseDemography](../../../../components/Charts/AnalyseDemography.tsx).
The production chart components and Payload data model are not migrated here.

## Old model versus new model

The old model encodes several dimensions in nested object keys and combined
measure names:

```ts
// Year -> area type -> area -> variable -> aggregation/measure
oldData.data.total[2019].region.Norge.autisme_barn.pas_n; // 5639
```

In the new model, the outer keys identify the view and category. Each observation
then names its dimensions explicitly:

```json
{
  "year": 2019,
  "rate_eller_antall": "antall",
  "pasienter_eller_kontaktdager": "pasienter",
  "variables": {
    "autisme_barn": 5639
  }
}
```

This row is in `observations.total.region.norge`. A lookup filters that array by
year and dimension values rather than constructing a key such as `pas_n`.

| Old representation | New representation |
| --- | --- |
| View `name` and `title` | View `id` and localized `label` |
| Variable `name`, `no`, `en` | Variable `id` and `label: { no, en }` |
| Area names used as data keys, e.g. `Norge` | Category IDs, e.g. `norge`, with separate display labels |
| `pas_n`, `pas_rate`, `kont_n`, `kont_rate` | Explicit `pasienter_eller_kontaktdager` and `rate_eller_antall` values |
| Per-view `year_range` drives available years | Unique sorted observation years drive available years |
| Per-view `aggregering` filters choices | Views reference shared dimension definitions |
| `age_range` generates demographic ages | The `alder` category type defines age categories |
| Separate nested demographic variable groups | One `demografi` view with age categories, gender/year dimensions, and variables including `population` |

IDs must be used exactly as supplied; there is no automatic conversion from old
names. For example, the new geographic view is `somatikk_ikke_s04e6`, not
`somatikk_ikke_s04E6`. Its variable `ikke-somatikk` is distinct from the demographic
variable `ikke_somatikk`.

### The four sections of the new dataset

1. **`categoryTypes`** defines category types such as `region`, `sykehus`, and
   `alder`. Each has an ID, localized label, and categories. Categories may include
   a `parent` reference, but this prototype does not use it for selection.
2. **`views`** defines tabs and their available category types, dimension
   references, and variables. Array order determines tab and variable order.
3. **`dimensions`** defines shared filters. Enum dimensions contain labeled
   `values` and an optional `default`; the year dimension has a numeric `range`.
4. **`observations`** contains numeric values at
   `observations[viewId][categoryTypeId][categoryId]`. Each array row contains its
   year, applicable dimension values, and a `variables` object.

Analysis-level metadata remains outside this dataset: `AnalyserPocMock` wraps it
with title, author, timestamps, and other page metadata. The old description and
contact terminology are not automatically migrated. Chart captions are built
from the wrapper title, view/variable labels, selected dimension labels, and years.

## How the implementation works

```text
page.tsx: example JSON + analysis metadata
  -> ChartContainerPocMock: selected view, category type, dimensions, year
    -> chartData: filter observations and calculate chart rows
      -> AnalyseBarChart / MUI LineChart
```

### Views, controls, and selection

- Tabs are generated from `data.views`. The initial view is `total`; its tab is
  labeled **Analyse**. The `demografi` ID activates the demographic rendering path.
- `DimensionControls` renders the active view's enum dimensions, except `kjonn`
  in demography, where the gender-split control is used instead.
- `getDimensionValues` resolves each enum value in this order: selected value,
  dimension default, first declared value. Invalid values throw an error.
  In the current fixture, the initial choices are `rate` and `pasienter`.
- Geographic category types come from the active view. The preferred initial
  type is `sykehus`; if unavailable, the first declared type is used.
- Area selections are stored by category-type ID, and variable selections by
  view ID. Switching focus tabs retains the single-year/time-series mode.
- `getYears` reads actual observations, not the declared year range. The latest
  available year is initially selected. If a selected year is unavailable in a
  different view, the nearest available year is displayed.

### Chart calculations

| Mode | Helper | Behavior |
| --- | --- | --- |
| Single year | `getBarRows` | Reads all view variables for every category at the selected year/dimensions; sums variables for stacked bars. |
| Time series | `getTrendRows` | Reads one selected variable for every category across the view's observed years. |
| Demography | `getDemographyRows` | Reads age categories and gender observations; returns split or combined series for counts or population shares. |

Area selection highlights bars and determines which non-national series appear
in time series; it does not remove unselected bars. The national category `norge`
is not selectable. It appears automatically for rates; it is excluded from
count bars and can be enabled separately for count time series.

Chart maxima are calculated across years so changing the year does not rescale
the axis. Bar maxima use non-national stacked totals. Trend maxima include the
national series when it is visible; demographic maxima use individual-year
values for the selected variable and display mode.

For demography:

- Single-year counts are the observed counts.
- **All years** counts are annual averages: `sum(counts) / numberOfYears`.
- Shares are `sum(counts) / sum(population)` across selected years and genders,
  not an average of annual percentages.
- Shares remain fractions in chart data and are formatted as percentages.
- Combined series sum genders before calculating the average or share.
- `population` is the denominator and is excluded from the variable dropdown.

### Missing data and errors

`getValue` returns `null` for a missing row or variable, preserving real zeros.
Multiple matching rows and non-finite numeric values throw errors.

Trend and demographic missing values become gaps, with a warning for the current
selection. A missing demographic population, or a summed population of zero,
also produces a gap for shares. Bar data must be complete: a missing value throws
an error instead of silently substituting zero.

Export failures are logged and shown in an error notification. A successful
clipboard notification appears only after writing the chart image succeeds.

## Extending the dataset

When adding a geographic view:

1. Give it a unique ID, `no`/`en` labels, category-type references, dimension
   references, and labeled variables.
2. Define any referenced category types and dimensions.
3. Add observations under the exact view, category-type, and category IDs.
4. Supply every applicable dimension value on each row. Filtering must identify
   at most one observation per view/category/dimension combination.
5. Supply numeric values for every declared variable. Geographic bar calculations
   currently require all categories and variables for every observed year and
   selectable dimension combination, because rows are prepared across years.
6. Check tabs, both chart modes, labels, year changes, and exports.

Changing a display label does not require changing its ID. Changing an ID does
require updating every reference and observation key that uses it.

### Prototype limitations

- This is not yet a generic chart engine: `view.type` does not dispatch chart
  renderers. All non-demographic views follow the geographic bar/trend path.
- IDs such as `total`, `demografi`, `sykehus`, `norge`, `kjonn`, `population`,
  `rate_eller_antall`, and `pasienter_eller_kontaktdager` still have special meaning
  in code. Adding unrelated dimensions or chart types may require UI changes.
- Enum controls use global dimension definitions; per-view value restrictions
  are not implemented.
- `Dimension.range` is metadata, not a filter or runtime validation rule.
- TypeScript types and lookup checks are not a complete runtime JSON-schema
  validator. Referential integrity and dataset completeness must still be checked.
- Parent references do not drive area selection. The old hierarchical selection
  behavior has not been ported.
- The example page currently supplies Norwegian labels/dictionary props.
  The optional `nynorsk` prop is not currently used by the component.
- Debug panels and presentation/layout are still part of the proof of concept.

## Regression checks

With dependencies installed and Node.js supporting native TypeScript type
stripping, run from the repository root:

```bash
cd 'src/app/(frontend)/[lang]/ny-datastruktur'
node --test chartData.test.mjs
```

Running inside this directory avoids treating `[lang]` as a test-path glob.
The tests cover exact parity for 4,536 geographic values and 1,008 demographic
values, dimension defaults, all measure/aggregation combinations, demographic
averages and shares, real zeros, missing values, duplicate observations, invalid
numbers, and non-contiguous years.

These are calculation tests, not browser tests. Also check the responsive year
selector, area selection, tab switching, chart rendering, and exports in the app.