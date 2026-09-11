import { BarChart, barClasses } from "@mui/x-charts/BarChart";
import type { BarProps } from '@mui/x-charts/BarChart';
import classNames from "@/lib/ChartClasses.module.css";
import { legendClasses } from '@mui/x-charts/ChartsLegend';

import { useAnimateBar } from '@mui/x-charts/hooks';

function AnimatedBar(props: BarProps & { special_bars: Set<number>, selected_bars: Set<number> }) {
  const { ownerState, seriesId, dataIndex, xOrigin, yOrigin, skipAnimation, special_bars, selected_bars, ...other } = props;
  const animatedProps = useAnimateBar(props);

  return (
    <rect
      {...other}
      className={
        `${other.className}
        ${classNames.barElement}
        ${special_bars.has(props.dataIndex) ? classNames.national : ""}
        ${selected_bars.has(props.dataIndex) ? classNames.selected : ""}
        cursor-pointer
        `}
      {...animatedProps}
    />
  );
}

interface AnalyseBarChartProps {
  categories: string[];
  categoryFmt: (category: string) => string;
  variables: string[];
  variableFmt: (variable: string) => string;
  valueGetter: (category: string, variable: string) => number;
  valueAxisFmt: (value: number) => string;
  valueFmt: (value: number | null) => string;
  special_values: Set<string>;
  selection: Set<string>;
  onClick: (category: string) => void;
  maxValue: number;
}

export const AnalyseBarChart = ({
  categories,
  categoryFmt,
  variables,
  variableFmt,
  valueGetter,
  valueAxisFmt,
  valueFmt,
  special_values,
  selection,
  onClick,
  maxValue,
}: AnalyseBarChartProps) => {
  const data = categories
    .map((category) => ({
      category,
      ...Object.fromEntries(
        variables.map((variable) => [
          variable,
          valueGetter(category, variable),
        ]),
      ),
      sum: variables
        .map((variable) => valueGetter(category, variable))
        .reduce((a, b) => a + b),
    }))
    .toSorted((a, b) => b.sum - a.sum);

  return (
    <BarChart
      dataset={data}
      hideLegend={variables.length < 2}
      series={variables.map((variable, i) => ({
        dataKey: variable,
        label: variableFmt(variable),
        valueFormatter: valueFmt,
        stack: "yes",
        id: `${i}`,
        color: `var(--bar-${variables.length - i})`
      }))}
      yAxis={[
        {
          scaleType: "band",
          dataKey: "category",
          tickPlacement: "middle",
          valueFormatter: categoryFmt,
          width: 'auto',
        },
      ]}
      xAxis={[
        {
          min: 0,
          max: maxValue,
          valueFormatter: valueAxisFmt,
          height: 'auto',
        },
      ]}
      layout="horizontal"
      slots={{
        bar: AnimatedBar as any
      }}
      slotProps={{
        bar: {
          special_bars: new Set(data.flatMap((value, i) => special_values.has(value.category) ? [i] : [])),
          selected_bars: new Set(data.flatMap((value, i) => selection.has(value.category) ? [i] : []))
        } as any,
        legend: {
          toggleVisibilityOnClick: true,
          sx: {
            [`.${legendClasses.label}`]: {
              fontSize: 14
            }
          },
        },
      }}
      sx={{
        [`& rect.${barClasses.element}`]: {
          // This fixes blinking bars in Chrome during transition when selecting an area
          transitionProperty: 'none',
        },
      }}
      onAxisClick={(_, params) => onClick(String(params?.axisValue))}
    />
  );
};
