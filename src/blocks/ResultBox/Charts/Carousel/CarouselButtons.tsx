import { type JSX } from "react";
import classNames from "@/lib/ChartClasses.module.css";

type CarouselButtonsProps = {
  options: {
    value: number;
    label: string;
    icon: JSX.Element;
  }[];
  activeCarousel: number;
  onClick?: (nr: number) => void;
};

export const CarouselButtons = ({
  options,
  onClick,
  activeCarousel,
}: CarouselButtonsProps) => {
  return (
    <ul className={classNames.buttonscontainer}>
      {options.map((optn, i) => {
        return (
          <li className={classNames.bulletcontainer} key={i}>
            <button
              aria-label={"show item " + i}
              className={`${classNames.bullet} ${i === activeCarousel ? classNames.active : ""
                }`}
              onClick={() => onClick && onClick(i)}
            >
              {optn.icon}
            </button>
          </li>
        );
      })}
    </ul>
  );
};
