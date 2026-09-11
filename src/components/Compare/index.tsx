"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckIcon from "@mui/icons-material/Check";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import { formatDate, formatNumber } from "@/lib/helpers";
import { BarChart } from "@mui/x-charts";
import React from "react";
import { Analyser } from "@/payload-types";

const DiffChart = ({ data }: { data: any }) => {
  const valueFormatter = (value: number | null) =>
    `${formatNumber((value || 0) / 1000, "no", { style: "percent" })}`;
  return (
    <BarChart
      height={500}
      margin={{ left: 120 }}
      layout="horizontal"
      dataset={data}
      yAxis={[{ dataKey: "areaName", scaleType: "band" }]}
      series={[
        {
          stack: "diff",
          dataKey: "neg_diff",
          color: "#E00000",
          label: "Prosent avvik (for lite)",
          valueFormatter,
        },
        {
          stack: "diff",
          dataKey: "pos_diff",
          color: "#FDDA0D",
          label: "Prosent avvik (for mye)",
          valueFormatter,
        },
      ]}
    />
  );
};


enum Severity {
  Message,
  Warning,
  Error,
}

type ReportResults = {
  severity: Severity;
  Elem: ({ depth }: { depth: number }) => React.JSX.Element;
}[];

type CompareProps = {
  oldAnalyse: Analyser["data"] | false;
  newAnalyse: Analyser["data"];
  different: boolean;
};


export const Compare = ({ oldAnalyse, newAnalyse, different }: CompareProps) => {
  const makeReport = (
    title: string,
    results: ReportResults,
    maxResults: number = 5,
  ): ReportResults => {
    const maxSeverity = results
      .map((r) => r.severity)
      .reduce((prev, curr) => Math.max(prev, curr), Severity.Message);

    const icons = {
      [Severity.Message]: <CheckIcon color="success" />,
      [Severity.Warning]: <WarningIcon color="warning" />,
      [Severity.Error]: <ErrorIcon color="error" fontSize="large" />,
    };

    return [
      {
        severity: maxSeverity,
        Elem: ({ depth }) => {
          const [showAll, setShowAll] = React.useState(false);

          const titleElem = (
            <Typography
              variant={depth === 0 ? "h2" : "h4"}
              sx={{ marginTop: 1, marginBottom: 1 }}
            >
              {title} {icons[maxSeverity]}{" "}
            </Typography>
          );

          return results.length <= 1 || depth === 0 ? (
            <Box sx={{ marginX: 2 }}>
              {titleElem}
              {results.map(({ severity, Elem }, i) => (
                <Elem depth={depth + 1} key={i} />
              ))}
            </Box>
          ) : (
            <Accordion color="primary" disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                {titleElem}
              </AccordionSummary>
              <AccordionDetails>
                {results
                  .slice(0, showAll ? Infinity : maxResults)
                  .map(({ severity, Elem }, i) => (
                    <Elem key={i} depth={depth + 1} />
                  ))}
                {results.length > maxResults && (
                  <Box sx={{ marginTop: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={(e) => setShowAll(!showAll)}
                    >
                      {showAll ? "Vis mindre" : "Vis mer"}
                    </Button>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        },
      },
    ];
  };

  const findYears = (
    analyse: Analyser["data"],
  ): { [k: string]: undefined | { range: number[]; span: [number, number] } } =>
    Object.fromEntries(
      analyse.views.map((v) => {
        if (Object.keys(analyse.data[v.name])[0] === "NA") {
          return [v.name, undefined];
        } else {
          return [
            v.name,
            {
              span: v.year_range,
              range: Array.from(
                { length: v.year_range[1] - v.year_range[0] + 1 },
                (_, i) => v.year_range[0] + i,
              ),
            },
          ];
        }
      }),
    );

  const newYears = findYears(newAnalyse);

  const internalIntegrity = newAnalyse.views
    .filter((view) => view.name !== "total" && view.type === "standard")
    .flatMap((view) => {
      const variables = view.variables.map((v) => v.name);
      return (newYears[view.name]?.range || ["NA"]).flatMap((year) =>
        ["sykehus", "region"].flatMap((level) =>
          (view.aggregering === "begge"
            ? ["kont", "pas"]
            : [view.aggregering]
          ).flatMap((aggregering) => {
            const viewData = Object.keys(
              newAnalyse.data[view.name][year][level],
            )
              .map((area) => {
                const sum = variables
                  .map(
                    (varName) =>
                      newAnalyse.data[view.name][year][level][area][varName][
                        `${aggregering}_rate`
                      ],
                  )
                  .reduce((a, b) => a + b, 0);

                const correctSum =
                  newAnalyse.data["total"][year][level][area][newAnalyse.name][
                    `${aggregering}_rate`
                  ];
                const raw_diff = (sum / correctSum - 1) * 1000;

                return {
                  areaName: String(area),
                  sum,
                  correctSum,
                  diff: Math.abs(raw_diff),
                  neg_diff: Math.abs(Math.min(raw_diff, 0)),
                  pos_diff: Math.max(raw_diff, 0),
                };
              })
              .toSorted((a, b) => b.diff - a.diff);

            if (viewData.some((area) => area.diff > 10)) {
              return [
                {
                  severity: Severity.Error,
                  Elem: () => (
                    <Box key={`${year}-${level}-${view.name}`}>
                      <Typography variant="h5" sx={{ marginTop: 1 }}>
                        Mulig avvik i {year}, på {level}-nivå, i visningen{" "}
                        <em>{view.name}</em>, aggregert på{" "}
                        {{ kont: "kontakter", pas: "pasienter" }[aggregering]}
                      </Typography>
                      <DiffChart data={viewData}></DiffChart>
                    </Box>
                  ),
                },
              ];
            } else return [];
          }),
        ),
      );
    });

  const internalIntegrityReport = makeReport(
    "Intern integritet",
    internalIntegrity.length
      ? internalIntegrity
      : [
          {
            severity: Severity.Message,
            Elem: () => (
              <span>
                Summen av variablene i alle visningene er lik totalen.
              </span>
            ),
          },
        ],
  );

  let externalReports: ReportResults = [];

  if (!different) {
    externalReports = makeReport(
      "Sammenligning med publisert versjon",
      [
        {
          severity: Severity.Message,
          Elem: () => (
            <span>
              Den publiserte versjonen og den nye versjonen av analysen er
              identiske.
            </span>
          ),
        },
      ],
    );
  }
  else if (oldAnalyse) {
    const oldYears = findYears(oldAnalyse);

    const oldViews = new Set(oldAnalyse.views.map((view) => view.name));
    const newViews = new Set(newAnalyse.views.map((view) => view.name));
    const oldViewsDiff = oldViews.difference(newViews);
    const newViewsDiff = newViews.difference(oldViews);

    const differentVarCount = Array.from(newViews.intersection(oldViews))
      .flatMap((viewName) => {
        const oldVarcount = oldAnalyse.views.find((v) => v.name === viewName)
          ?.variables.length;
        const newVarcount = newAnalyse.views.find((v) => v.name === viewName)
          ?.variables.length;

        return oldVarcount === newVarcount
          ? []
          : {
              severity: Severity.Warning,
              Elem: () => (
                <span>
                  Visningen {viewName} finnes i begge versjoner, men de har et
                  forskjellig antall variabler (den gamle versjonen har{" "}
                  {oldVarcount}, mens den nye har {newVarcount}). Denne
                  visningen vil derfor ikke bli sjekket for extern integritet.
                </span>
              ),
            };
      })
      .filter(Boolean);

    const viewResults = [
      ...(oldViewsDiff.size > 0
        ? [
            {
              severity: Severity.Warning,
              Elem: () => (
                <span>
                  Disse visningene finnes bare i den gamle versjonen:{" "}
                  {Array.from(oldViewsDiff).join(", ")}.
                </span>
              ),
            },
          ]
        : []),
      ...(newViewsDiff.size > 0
        ? [
            {
              severity: Severity.Warning,
              Elem: () => (
                <span>
                  Disse visningene finnes bare i den nye versjonen:{" "}
                  {Array.from(newViewsDiff).join(", ")}.
                </span>
              ),
            },
          ]
        : []),
    ].concat(differentVarCount);

    const viewReport = makeReport(
      "Visninger",
      (viewResults.length && viewResults) || [
        {
          severity: Severity.Message,
          Elem: () => (
            <span>
              Visningene er de samme i begge versjoner, og visningene har samme
              antall variabler.
            </span>
          ),
        },
      ],
    );

    const yearReport = makeReport(
      "Årstall",
      Array.from(oldViews.intersection(newViews)).flatMap(
        (viewName): ReportResults => {
          if (
            oldYears[viewName] !== undefined &&
            newYears[viewName] !== undefined
          ) {
            return oldYears[viewName].span[0] !== newYears[viewName].span[0] ||
              ![
                oldYears[viewName].span[1],
                (oldYears[viewName].span[1] as number) + 1,
              ].includes(newYears[viewName].span[1])
              ? [
                  {
                    severity: Severity.Warning,
                    Elem: () => (
                      <span>
                        Årstallene i visningen <em>{viewName}</em> i den nye
                        analysen skiller seg på en uvanlig måte fra den gamle.
                        Årstall i den gamle analysen:{" "}
                        {oldYears[viewName]!.span.join("–")}. Årstall for
                        visningen den nye analysen:{" "}
                        {newYears[viewName]!.span.join("–")}.
                      </span>
                    ),
                  },
                ]
              : [];
          } else {
            return [];
          }
        },
      ),
    );

    const ageReport = makeReport(
      "Aldersspenn",
      oldAnalyse.age_range.toString() === newAnalyse.age_range.toString()
        ? [
            {
              severity: Severity.Message,
              Elem: () => (
                <span>
                  Aldersspennet er identiske for begge versjonene:{" "}
                  {oldAnalyse.age_range.join("–")} år.
                </span>
              ),
            },
          ]
        : [
            {
              severity: Severity.Warning,
              Elem: () => (
                <span>
                  Den nye analysen har aldersgruppe{" "}
                  {newAnalyse.age_range.join("–")}, mens den gamle har{" "}
                  {oldAnalyse.age_range.join("–")}.
                </span>
              ),
            },
          ],
    );

    const kjonnReport = makeReport(
      "Kjønn",
      oldAnalyse.kjonn === newAnalyse.kjonn
        ? [
            {
              severity: Severity.Message,
              Elem: () => (
                <span>
                  Kjønn er det samme i begge versjoner ({oldAnalyse.kjonn}).
                </span>
              ),
            },
          ]
        : [
            {
              severity: Severity.Warning,
              Elem: () => (
                <span>
                  Den nye analysen har kjønn <em>{newAnalyse.kjonn}</em>, mens
                  den gamle har <em>{oldAnalyse.kjonn}</em>.
                </span>
              ),
            },
          ],
    );

    const generertReport = makeReport(
      "Genereringstidspunkt",
      oldAnalyse.generated > newAnalyse.generated
        ? [
            {
              severity: Severity.Error,
              Elem: () => (
                <span>
                  Den nye analysen ble generert i SAS før den gamle analysen.
                  Den gamle versjonen ble generert{" "}
                  {formatDate(new Date(oldAnalyse.generated), "no")}, mens den
                  nye versjonen ble generert{" "}
                  {formatDate(new Date(newAnalyse.generated), "no")}.
                </span>
              ),
            },
          ]
        : oldAnalyse.generated === newAnalyse.generated
          ? [
              {
                severity: Severity.Message,
                Elem: () => (
                  <span>
                    Den gamle og den nye versjonen ble generert i SAS på samme
                    tidspunkt (
                    {formatDate(new Date(newAnalyse.generated), "no")}).
                  </span>
                ),
              },
            ]
          : [
              {
                severity: Severity.Message,
                Elem: () => (
                  <span>
                    Den nye analysen ble generert i SAS etter den gamle.
                  </span>
                ),
              },
            ],
    );

    const identicalViews = Array.from(newViews.union(oldViews)).filter(
      (viewName) =>
        oldAnalyse.views.find((v) => v.name === viewName)?.variables.length ===
        newAnalyse.views.find((v) => v.name === viewName)?.variables.length,
    );

    const commonYearsRange: { [k: string]: ["NA"] | number[] } =
      Object.fromEntries(
        identicalViews.map((viewName) => {
          if ([oldYears[viewName], newYears[viewName]].includes(undefined)) {
            return [viewName, ["NA"]];
          } else {
            const maxYear = Math.max(
              newYears[viewName]!.span[0] as number,
              oldYears[viewName]!.span[0] as number,
            );
            const minYear = Math.min(
              newYears[viewName]!.span[1] as number,
              oldYears[viewName]!.span[1] as number,
            );

            return [
              viewName,
              Array.from(
                { length: minYear - maxYear + 1 },
                (_, i) => maxYear + i,
              ),
            ];
          }
        }),
      );

    const externalIntegrity = identicalViews.flatMap((viewName) =>
      commonYearsRange[viewName].flatMap((year) =>
        Object.keys(newAnalyse.data[viewName][year]).flatMap((categoryType) => {
          const view = newAnalyse.views.find(
            (v) => v.name === viewName,
          ) as Analyser["data"]["views"][0];

          return view.variables.flatMap((variable) => {
            const inflections = new Set(
              Object.keys(
                newAnalyse.data[viewName][year][categoryType][
                  Array.from(
                    Object.keys(newAnalyse.data[viewName][year][categoryType]),
                  )[0]
                ][variable.name],
              ),
            ).intersection(
              new Set(
                Object.keys(
                  oldAnalyse.data[viewName][year][categoryType][
                    Array.from(
                      Object.keys(
                        oldAnalyse.data[viewName][year][categoryType],
                      ),
                    )[0]
                  ][variable.name],
                ),
              ),
            );
            return Array.from(inflections).flatMap((inflection, i) => {
              const graphData = Object.keys(
                oldAnalyse.data[viewName][String(year)][categoryType],
              )
                .map((category) => {
                  const oldValue =
                    oldAnalyse.data[viewName][year][categoryType][category][
                      variable.name
                    ][inflection];
                  const newValue =
                    newAnalyse.data[viewName][year][categoryType][category][
                      variable.name
                    ][inflection];
                  const raw_diff = (newValue / oldValue - 1) * 1000 || 0;

                  return {
                    areaName: String(category),
                    oldValue: oldValue,
                    newValue: newValue,
                    diff: Math.abs(raw_diff),
                    neg_diff: Math.abs(Math.min(raw_diff, 0)),
                    pos_diff: Math.max(raw_diff, 0),
                  };
                })
                .toSorted((a, b) => b.diff - a.diff);

              if (graphData.some((data) => data.diff > 0)) {
                return [
                  {
                    severity: graphData.some(
                      (data) => data.diff > 100, // more than 10% difference,
                    )
                      ? Severity.Error
                      : Severity.Warning,
                    Elem: () => (
                      <Box key={`${year}-${categoryType}-${viewName}-${i}`}>
                        <Typography variant="h5" sx={{ marginTop: 1 }}>
                          Mulig avvik i {year}, i visningen {viewName}, for
                          variabelen {variable.no} ({inflection})
                        </Typography>
                        <DiffChart data={graphData} />
                      </Box>
                    ),
                  },
                ];
              } else return [];
            });
          });
        }),
      ),
    );

    const externalIntegrityReport = makeReport(
      "Extern integritet",
      externalIntegrity.length
        ? externalIntegrity
        : [
            {
              severity: Severity.Message,
              Elem: () => (
                <span>
                  Variablene i den gamle og nye analysen har samme verdi for
                  årene de deler.
                </span>
              ),
            },
          ],
    );

    externalReports = makeReport(
      "Sammenligning med publisert versjon",
      viewReport.concat(
        yearReport,
        ageReport,
        kjonnReport,
        generertReport,
        externalIntegrityReport,
      ),
      Infinity,
    );
  }

  const OuterReport = makeReport(
    "Dataintegritet",
    internalIntegrityReport.concat(oldAnalyse ? externalReports : []),
    Infinity,
  )[0].Elem;

  return <OuterReport depth={0} />;
};
