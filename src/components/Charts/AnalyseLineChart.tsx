import { Lang } from "@/types";
import { LineChart } from "@mui/x-charts/LineChart";
import { Selection } from "@/lib/selection";
import React from "react";
import { Analyser } from "@/payload-types";

const linechart_colors: {
  sykehus: { [k: string]: string };
  region: { [k: string]: string };
} = {
  sykehus: {
    Finnmark: "#C3A687",
    UNN: "#1F51FF",
    Nordland: "#003283",
    Helgeland: "#8C00FF",
    NordTrøndelag: "#F38411",
    St_Olav: "#42E0F5",
    Møre_og_Romsdal: "#81BD00",
    Førde: "#839C8F",
    Bergen: "#5C3229",
    Fonna: "#11F063",
    Stavanger: "#6B9B3A",
    Østfold: "#D9CB68",
    Akershus: "#BD0C2E",
    OUS: "#C5F542",
    Lovisenberg: "#E3A611",
    Diakonhjemmet: "#EF42F5",
    Innlandet: "#F0116E",
    Vestre_Viken: "#8D6A59",
    Vestfold: "#101010",
    Telemark: "#81A9E1",
    Sørlandet: "#FFA3EB",
    Norge: "#9AA2AB",
  },
  region: {
    Helse_Nord: "#C5F542",
    Helse_MidtNorge: "#F38411",
    Helse_Vest: "#81A9E1",
    Helse_SørØst: "#BD0C2E",
    Norge: "#9AA2AB",
  },
};

type AnalyseLineChartProps = {
  analyse: Analyser["data"];
  years: number[];
  level: "region" | "sykehus";
  variable: { viewName: string; name: string };
  categoryFmt: (category: string) => string;
  valueFmt: (value: number | null) => string;
  showNorway: boolean;
  selection: Selection;
  inflection: string;
  maxValue: number;
  lang: Lang;
};

export const AnalyseLineChart = ({
  analyse,
  years,
  level,
  variable,
  showNorway,
  selection,
  inflection,
  categoryFmt,
  valueFmt,
  maxValue,
  lang,
}: AnalyseLineChartProps) => {

  const dataset: { [k: string]: number; year: number }[] = React.useMemo(() => {
    return years.map((year) => {
      const areas = analyse.data[variable.viewName][year][level];
      return Object.fromEntries([
        ["year", year],
        ...Object.keys(areas).map((area) => [
          area,
          Number(areas[area][variable.name][inflection]),
        ]),
      ]);
    });
  }, [analyse, years, level, variable]);

  const selectionIDs = ["Norge", ...Array.from(selection[level]).map(String)];

  return (
    <LineChart
      dataset={dataset}
      xAxis={[
        {
          scaleType: "point",
          dataKey: "year",
          valueFormatter: (value) => `${value}`,
          height: 'auto'
        },
      ]}
      yAxis={[{ min: 0, max: maxValue * 1.01 }]}
      series={selectionIDs
        .filter((area) => area !== "Norge" || showNorway)
        .map((area) => ({
          dataKey: area,
          id: area,
          valueFormatter: valueFmt,
          curve: "linear",
          showMark: true,
          shape: "circle",
          label: categoryFmt(area),
          color: linechart_colors[level][area],
        }))}
      localeText={{
        noData: {
          no: "Ingen opptaksområder valgt",
          en: "No referrral areas chosen",
        }[lang]
      }}
    />
  );
};
