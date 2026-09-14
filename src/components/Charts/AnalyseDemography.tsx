import React from "react";
import { LineChart } from "@mui/x-charts";
import { Lang } from "@/types";
import { formatNumber } from "@/lib/helpers";
import { Analyser } from "@/payload-types";
import { legendClasses } from '@mui/x-charts/ChartsLegend';

type AnalyseDemographyProps = {
  analyse: Analyser["data"];
  year: number | "all_years";
  years: number[];
  showGenders: boolean;
  andel: boolean;
  lang: Lang;
  variable: { viewName: string; name: string };
};

type DemographyCounts = {
  kvinner: number;
  kvinner_pop: number;
  menn: number;
  menn_pop: number;
};

const AnalyseDemography = ({
  analyse,
  year,
  years,
  andel,
  lang,
  showGenders,
  variable,
}: AnalyseDemographyProps) => {
  const aldre = Array.from(
    { length: analyse.age_range[1] - analyse.age_range[0] + 1 },
    (_, i) => analyse.age_range[0] + i,
  );

  const demographyData = React.useMemo(() => {
    const getCounts = (year: number, alder: number): DemographyCounts => ({
      kvinner:
        analyse.data.demografi[year][variable.viewName][alder][variable.name]
          .kvinner,
      kvinner_pop:
        analyse.data.demografi[year].population[alder].population.kvinner,
      menn:
        analyse.data.demografi[year][variable.viewName][alder][variable.name]
          .menn,
      menn_pop:
        analyse.data.demografi[year].population[alder].population.menn,
    });

    const makeRow = (
      alder: number,
      counts: DemographyCounts,
      average: boolean,
    ) => {
      const { kvinner, kvinner_pop, menn, menn_pop } = counts;
      const divisor = average ? years.length : 1;

      return {
        alder,
        ...(analyse.kjonn !== "menn" && {
          kvinner: kvinner / divisor,
          kvinner_andel: (kvinner / kvinner_pop) * 100,
        }),
        ...(analyse.kjonn !== "kvinner" && {
          menn: menn / divisor,
          menn_andel: (menn / menn_pop) * 100,
        }),
        ...(analyse.kjonn === "begge" && {
          begge: (kvinner + menn) / divisor,
          begge_andel: ((kvinner + menn) / (kvinner_pop + menn_pop)) * 100,
        }),
      };
    };

    const data = Object.fromEntries(
      years.map((year) => [
        year,
        aldre.map((alder) => makeRow(alder, getCounts(year, alder), false)),
      ]),
    );
    const average = aldre.map((alder) => {
      const totals = years.reduce(
        (total, year) => {
          const counts = getCounts(year, alder);
          return {
            kvinner: total.kvinner + counts.kvinner,
            kvinner_pop: total.kvinner_pop + counts.kvinner_pop,
            menn: total.menn + counts.menn,
            menn_pop: total.menn_pop + counts.menn_pop,
          };
        },
        { kvinner: 0, kvinner_pop: 0, menn: 0, menn_pop: 0 },
      );

      return makeRow(alder, totals, true);
    });

    return { ...data, all_years: average } as {
      [k: string]: { [k: string]: number }[];
    };
  }, [analyse, years, variable]);

  const maxValues = React.useMemo(
    () =>
      Object.fromEntries(
        [
          ...(analyse.kjonn !== "menn" ? ["kvinner", "kvinner_andel"] : []),
          ...(analyse.kjonn !== "kvinner" ? ["menn", "menn_andel"] : []),
          ...(analyse.kjonn === "begge" ? ["begge", "begge_andel"] : []),
        ].map((key) => [
          key,
          Math.max(
            ...years.map((year) =>
              Math.max(...demographyData[year].map((d) => d[key]!)),
            ),
          ),
        ]),
      ),
    [analyse, years, demographyData],
  );

  const andelOrAntall = andel ? "andel" : "antall";
  const dataKeys = {
    andel: {
      kvinner: "kvinner_andel",
      menn: "menn_andel",
      begge: "begge_andel",
    },
    antall: {
      kvinner: "kvinner",
      menn: "menn",
      begge: "begge",
    },
  };

  return (
    <LineChart
      dataset={demographyData[year]}
      hideLegend={!showGenders || analyse.kjonn !== "begge"}
      xAxis={[
        {
          scaleType: "point",
          dataKey: "alder",
          tickInterval: (value) =>
            value % Math.floor(Math.max(1, aldre.length / 20)) === 0,
          valueFormatter: (value, context) =>
            value +
            (context.location === "tooltip"
              ? { no: " år", en: " years" }[lang]
              : ""),
          height: 'auto'
        },
      ]}
      yAxis={[
        {
          min: 0,
          max:
            (showGenders
              ? Math.max(
                (["begge", "kvinner"].includes(analyse.kjonn) &&
                  maxValues[dataKeys[andelOrAntall]["kvinner"]]) ||
                0,
                (["begge", "menn"].includes(analyse.kjonn) &&
                  maxValues[dataKeys[andelOrAntall]["menn"]]) ||
                0,
              )
              : maxValues[dataKeys[andelOrAntall]["begge"]]) * 1.01,
          valueFormatter: (value: number | null) =>
            andel
              ? formatNumber((value || 0) / 100, lang, { style: "percent" })
              : formatNumber(value || 0, lang),
          width: 'auto',
        },
      ]}
      series={(showGenders
        ? [
          ...((["begge", "kvinner"].includes(analyse.kjonn) && [
            { dataKey: dataKeys[andelOrAntall]["kvinner"], label: "Kvinner" },
          ]) ||
            []),
          ...((["begge", "menn"].includes(analyse.kjonn) && [
            { dataKey: dataKeys[andelOrAntall]["menn"], label: "Menn" },
          ]) ||
            []),
        ]
        : [{ dataKey: dataKeys[andelOrAntall]["begge"], label: "Begge kjønn" }]
      ).map((series, i) => ({
        ...series,
        showMark: false,
        baseline: "min",
        color: ["#00509E", "#95BDE6"][i],
        valueFormatter: (value: number | null) =>
          andel
            ? formatNumber((value || 0) / 100, lang, { style: "percent" })
            : formatNumber(value || 0, lang, { maximumFractionDigits: 0 }),
      }))}
      slotProps={{
        legend: {
          sx: {
            [`.${legendClasses.mark}`]: {
              width: 20,
              ["& path"]: { strokeWidth: 4 }
            },
            [`.${legendClasses.label}`]: {
              fontSize: 14
            }
          }
        },
      }}
    />
  );
};

export default AnalyseDemography;
