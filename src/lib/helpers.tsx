import { Analyser, Rapporter } from "@/payload-types";
import { Lang } from "@/types";
import { Typography } from "@mui/material";

export function formatDate(date: Date | string, lang: Lang) {
  return new Date(date).toLocaleString({ en: "en-GB", no: "nb-NO" }[lang], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function makeDateElem(date: Date | string, lang: Lang) {
  return (
    <time dateTime={new Date(date).toISOString()}>
      {formatDate(date, lang)}
    </time>
  );
}

export function formatNumber(
  number: number,
  lang: Lang,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(lang, {
    maximumFractionDigits:
      options?.style === "percent"
        ? Number(number < 0.1) + Number(number < 0.05) + Number(number < 0.0015)
        : 1 + Number(number < 5) + Number(number < 0.5),
    ...options,
  }).format(number);
}

function getAgeRange(analyse: Analyser["data"], lang: Lang) {
  const [min_age, max_age] = analyse.age_range;
  switch (true) {
    case min_age === 0 && max_age > 100:
      return false;
    case max_age > 100:
      return `${min_age} ${{ en: "years and older", no: "år og eldre" }[lang]}`;
    default:
      return `${min_age}–${max_age} ${{ en: "years", no: "år" }[lang]}`;
  }
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getCategory(analyse: Analyser["data"], nynorsk=false) {
  if (analyse.kategori_begrep) {
    return {
      ...analyse.kategori_begrep,
      special: true,
    };
  } else if (analyse.age_range[1] < 20) {
    return {
      begge: { en: "children", no: "barn", special: true },
      kvinner: { en: "girls", no: "jenter", special: true },
      menn: { en: "boys", no: nynorsk ? "gutar" : "gutter", special: true },
    }[analyse.kjonn];
  } else if (new Set(["kvinner", "menn"]).has(analyse.kjonn)) {
    return {
      kvinner: { en: "women", no: "kvinner", special: true },
      menn: { en: "men", no: "menn", special: true },
    }[analyse.kjonn as "menn" | "kvinner"];
  } else {
    return { en: "inhabitants", no: nynorsk ? "innbyggjarar" : "innbyggere", special: false };
  }
}

export function getVariableText(
  analyse: Analyser["data"],
  lang: Lang,
  variable: { viewName: string; name: string },
) {
  const view = analyse.views.find((v) => v.name === variable.viewName) as Analyser["data"]["views"][0];
  const variableObject = view.variables.find(
    (v) => v.name === variable.name,
  ) as Analyser["data"]["views"][0]["variables"][0];
  return (
    <>
      {` (`}
      <i>{view.title[lang]}</i>
      {" = "}
      <i>{variableObject[lang]}</i>
      {")"}
    </>
  );
}

export function getDescription(
  analyse: Analyser["data"],
  lang: Lang,
  type: "rate" | "n",
  aggregering: "kont" | "pas",
  variable?: { viewName: string; name: string },
  nynorsk: boolean = false,
) {
  const age_range = getAgeRange(analyse, lang);
  const age = age_range ? `, ${age_range}` : "";

  const variableText = variable && getVariableText(analyse, lang, variable);

  let kontaktType = {
    kont: { no: "kontakter", en: "contacts" },
    pas: { no: nynorsk ? "pasientar" : "pasienter", en: "patients" },
  }[aggregering][lang];
  if (aggregering === "kont" && analyse.kontakt_begrep) {
    kontaktType = analyse.kontakt_begrep[lang];
  }

  const kategori = getCategory(analyse, nynorsk)[lang];

  return (
    <Typography variant="body2">
      {type === "rate" ? (
        <>
          {analyse.description[lang]} – {kontaktType}{" "}
          {{ en: "per 1,000", no: "pr 1 000" }[lang]} {kategori}
          {age}
          {variableText}
        </>
      ) : (
        <>
          {analyse.description[lang]}
          {age}
          {variableText} – {{ en: "number of", no: nynorsk ? "antal" : "antall" }[lang]}{" "}
          {kontaktType}
        </>
      )}
    </Typography>
  );
}

export function getSubHeader(analyse: Analyser["data"], lang: Lang, nynorsk=false) {
  const age_range = getAgeRange(analyse, lang);
  const category = getCategory(analyse, nynorsk);

  const parts = [
    category.special && capitalize(category[lang]),
    age_range,
  ].filter(Boolean);

  return parts.join(", ");
}


export function isNewRapport(rapport: Rapporter) {
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - 30*5); // Kompendier med rapporter yngre en 30*5 dager er "new"

  return new Date(rapport.publishedAt as string) > limitDate;
}