"use client";
import React, { JSX, useMemo, useState } from "react";
import { CarouselButtons } from "./CarouselButtons";

// Import or define chart item types
import type { AtlasDataItem, DataItemPoint } from "../../types";

import { BiBarChart, BiLineChart, BiMapPin } from "react-icons/bi";
import { VscTable } from "react-icons/vsc";
import { AiOutlineInfoCircle } from "react-icons/ai";


import styles from "./Carousel.module.css";
import { PopUp } from "../../PopUp";
import { Barchart } from "../Barchart";
import { Linechart } from "../Linechart";
import { DataTable } from "../Table";
import { Map } from "../Map";
import { Box } from "@mui/material";

const chartIcons = {
  barchart: <BiBarChart color="white" size="1.3rem" />,
  linechart: <BiLineChart color="white" size="1.3rem" />,
  table: <VscTable color="white" size="1.3rem" />,
  map: <BiMapPin color="white" size="1.3rem" />,
};


const SelectionBtn = ({ lang }: { lang?: "nb" | "en" | "nn" }) => {
  return (
    <button className={styles.selectionBtn} data-testid="selectionBtn">
      <AiOutlineInfoCircle color="#033F85" />
      <span>
        {" "}
        {lang === "nn"
          ? "Utval"
          : lang === "en"
            ? "Patient selection"
            : "Utvalg"}
      </span>
    </button>
  );
};

type CarouselProps = {
  boxData: AtlasDataItem[];
  chartElems: JSX.Element[];
  utvalg: JSX.Element;
  lang?: "nb" | "en" | "nn";
};

export const Carousel = ({
  boxData,
  chartElems,
  utvalg,
  lang,
}: CarouselProps) => {
  const [activeComp, setActiveComp] = useState(0);

  const charts = boxData.filter((dataItem) => dataItem.type !== "data")

  const options = charts.map(
    (child, i) => ({
      value: i,
      label: child.type || `figur ${i + 1}`,
      icon: chartIcons[child.type],
    }),
  );

  if (!charts.length) return;

  return (
    <div className={styles.carouselWrapper}>
      {charts.length > 1 && (
        <CarouselButtons
          options={options}
          activeCarousel={activeComp}
          onClick={(i) => setActiveComp(i)}
        />
      )}
      <Box style={{ width: "95%", marginBottom: "1rem" }} key={activeComp}>
        {chartElems[activeComp]}
      </Box>
      <div style={{ alignSelf: "flex-start" }}>
        {<PopUp
          innerContentStyle={{
            position: "relative",
            width: "95%",
            maxWidth: "76rem",
            padding: "1.875rem 1.875rem 6.25rem 1.875rem",
            margin: "auto",
          }}
          btnComponent={() => <SelectionBtn lang={lang} />}
        >
          {utvalg}
        </PopUp>
        }
      </div>
    </div>
  );
};

export default Carousel;
