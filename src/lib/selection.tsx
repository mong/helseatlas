import { Lang } from "@/types";

const names: { [region: string]: string } = {
  Helse_SørØst: "Helse Sør-Øst",
  Helse_Vest: "Helse Vest",
  Helse_MidtNorge: "Helse Midt-Norge",
  Helse_Nord: "Helse Nord",
  Vestre_Viken: "Vestre Viken",
  NordTrøndelag: "Nord-Trøndelag",
  St_Olav: "St. Olav",
  Møre_og_Romsdal: "Møre og Romsdal",
};

export const hospitalStructure: { [region: string]: Set<string> } = {
  Helse_SørØst: new Set([
    "Østfold",
    "Akershus",
    "OUS",
    "Lovisenberg",
    "Diakonhjemmet",
    "Innlandet",
    "Vestre_Viken",
    "Vestfold",
    "Telemark",
    "Sørlandet",
  ]),
  Helse_Vest: new Set(["Førde", "Bergen", "Fonna", "Stavanger"]),
  Helse_MidtNorge: new Set(["NordTrøndelag", "St_Olav", "Møre_og_Romsdal"]),
  Helse_Nord: new Set(["Finnmark", "UNN", "Nordland", "Helgeland"]),
};

export class Selection {
  region: Set<string>;
  sykehus: Set<string>;

  constructor(init: { region: Set<string>; sykehus: Set<string> }) {
    this.region = init.region;
    this.sykehus = init.sykehus;
  }

  toggleRegion(region: string): Selection {
    return new Selection({
      region: this.region.symmetricDifference(new Set([region])),
      sykehus: this.region.has(region)
        ? this.sykehus.difference(hospitalStructure[region])
        : this.sykehus.union(hospitalStructure[region]),
    });
  }
  toggleSykehus(sykehus: string): Selection {
    const newSykehus = this.sykehus.symmetricDifference(new Set([sykehus]));
    return new Selection({
      region: new Set(
        Object.keys(hospitalStructure).filter((region) =>
          hospitalStructure[region].isSubsetOf(newSykehus),
        ),
      ),
      sykehus: newSykehus,
    });
  }
}

export const getAreaName = (areaName: string, lang: Lang, nynorsk: boolean) =>
  areaName === "Norge"
    ? (lang === "en" ? "Norway" : nynorsk ? "Noreg" : "Norge")
    : names[areaName] || areaName;
