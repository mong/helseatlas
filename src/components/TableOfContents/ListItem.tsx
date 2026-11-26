import React, { useState, useEffect } from "react";
import style from "./ListItem.module.css";

/**
 * Uses the IntersectionObserver API to watch the element with the given
 * `elementID` and set the `isVisible` state to true when the element is
 * visible in the viewport and false when it is not.
 *
 * @param {string} elementID The ID of the element to watch
 * @param {string} rootMargin The root margin to watch, see
 *   https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/rootMargin
 * @returns {boolean} True if the element is visible in the viewport, false
 *   otherwise
 */
const useIntersectionByID = (elementID: string, rootMargin: string) => {
  const [isVisible, setVisibility] = useState<boolean>(false);

  useEffect(() => {
    const element = document.getElementById(elementID);
    if (!element) return;

    /* In addition to observing the main element (the h2),
     * we also observe its children. We group these together
     * in `inView` to set the visibility for all of them.
     * This gives the effect of watching an entire section,
     * as each child contributes to the visiblity of the 
     * h2 which makes it appear bold in the ToC. */
    const inView = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inView.add(entry.target);
          else inView.delete(entry.target);
        }
        setVisibility(inView.size > 0);
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(element);
    document
      .querySelectorAll(`[data-section="${elementID}"]`)
      .forEach((elem) => observer.observe(elem));

    return () => observer.disconnect();
  }, [elementID, rootMargin]);

  return isVisible;
};


type ListItemProps = {
  children?: React.ReactNode;
  expanded?: string;
  setExpanded: React.Dispatch<React.SetStateAction<string>>;
  href: string;
  linkTitle: string;
  i?: string;
};

/**
 * A list item for the table of contents component.
 *
 * @param {ListItemProps} props The props for the list item.
 * @prop {React.ReactNode} [children] The children of the list item.
 * @prop {string} href The href of the link.
 * @prop {string} linkTitle The title of the link.
 * @prop {string} expanded The expanded state of the list item.
 * @prop {React.Dispatch<React.SetStateAction<string>>} setExpanded The function to set the expanded state.
 *
 * @returns The list item component.
 */
export const ListItem = ({
  children,
  href,
  linkTitle,
  expanded,
  setExpanded,
}: ListItemProps) => {
  /* Setting -20% makes only the bottom 80% count. As in when scrolling to
   * a new section. The old section will no longer be in focus (not bold in ToC)
   * when it has passed 80% of the screen from bottom-up. */
  const isVisbile = useIntersectionByID(href.replace("#", ""), "-20% 0px 0px 0px");

  return (
    <li
      className={`${style.tocListItem} ${isVisbile ? style.active : isVisbile}`}
    >
      <a
        href={href}
        onClick={() => {
          setExpanded((state) => (state === href ? "none" : href));
        }}
      >
        {linkTitle}
      </a>
      {(expanded === href || expanded === "all") && children}
    </li>
  );
};
