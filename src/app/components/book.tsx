import { useState, useMemo, useCallback, useRef, JSX } from "react";
import { Document, Page, PageProps, TextContent } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";

import { Box } from "@mui/material";
import { pdfjs } from "react-pdf";

import "./book.css";
import Controls from "./controls";
import OverlayControls from "./overlaycontrols";
import DragNZoom from "./dragnzoom";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const throwError = (error: Error) => {
  throw error;
};

const documentErrorHandlers = {
  onLoadError: throwError,
  onRenderError: throwError,
  onGetTextError: throwError,
};

const styleSvg = (svg: SVGElement, side: "left" | "right") => {
  const [, , width, height] =
    svg
      .getAttribute("viewBox")
      ?.split(" ")
      .map((v) => parseFloat(v)) ?? [];
  if (height === undefined) return;

  const trueWidth = parseFloat(svg.dataset.trueWidth ?? "") || width;
  svg.dataset.trueWidth = "" + trueWidth;
  const trueHeight = parseFloat(svg.dataset.trueHeight ?? "") || height;
  svg.dataset.trueHeight = "" + trueHeight;

  svg.setAttribute("width", String(trueWidth / 2));
  svg.setAttribute(
    "viewBox",
    [side === "right" ? trueWidth / 2 : 0, 0, trueWidth / 2, trueHeight].join(
      " ",
    ),
  );
};

export type Mode = "single"; // | "double";
export type SetPageVariation = (direction: "increment" | "decrement") => void;
export type GetProgress = () => number;
export type PageMap = Map<number, number>;

export default function Book({
  fullscreen,
  setFullscreen,
  url,
}: {
  fullscreen: boolean;
  setFullscreen: (setState: (oldState: boolean) => boolean) => void;
  url: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<Mode>("single");
  const [pageIndex, _setPageIndex] = useState(0);

  const relativeAbsoluteMap = useRef<PageMap>(new Map());
  const absoluteRelativeMap = useRef<PageMap>(new Map());

  const [length, setLength] = useState(0);
  const [documentWidth, setDocumentWidth] = useState<number | null>(null);
  const [documentHeight, setDocumentHeight] = useState<number | null>(null);

  const [loadedPages, setLoadedPages] = useState(0);
  const [pdfPages, setPdfPages] = useState<number | null>(null);
  const [pageWidths, setPageWidths] = useState<
    { width: number; height: number; type: 1 | 2 }[]
  >([]);

  const loaded = useMemo(() => {
    if (mode === "single") {
      setLoadedPages(0);

      return true;
    }

    return length !== 0 && loadedPages >= length;
  }, [loadedPages, length, mode]);

  const allPageWidthsSame = useMemo(
    () => pageWidths.every(({ width }) => width === documentWidth),
    [documentWidth, pageWidths],
  );

  const doc = useRef<HTMLDivElement>(null);
  const el = doc.current;
  if (loaded && el) {
    // style svgs on every render, not just original render, cause
    // react-pdf is resetting the width on unknown conditions
    for (const svg of el.querySelectorAll(".react-pdf__Page.left svg")) {
      styleSvg(svg as SVGElement, "left");
    }

    for (const svg of el.querySelectorAll(".react-pdf__Page.right svg")) {
      styleSvg(svg as SVGElement, "right");
    }
  }

  const pages = useMemo(() => {
    const relativeAbsoluteMapToSet = new Map<number, number>();
    const onRenderSuccess = () =>
      setLoadedPages((oldLoadedPages) => oldLoadedPages + 1);
    const commonProps: PageProps = {
      ...documentErrorHandlers,
      onRenderSuccess,
      scale: 2,
    };

    const result: (JSX.Element | JSX.Element[])[] = [];

    if (pageWidths.length && pdfPages) {
      for (let index = 0; index < pdfPages; index++) {
        if (allPageWidthsSame) {
          const isSingle = true; //mode !== 'double' || index === 0 || (pdfPages % 2 === 0 && index === pdfPages - 1)
          if (index % 2 !== 1 && !isSingle) continue;

          relativeAbsoluteMapToSet.set(
            relativeAbsoluteMapToSet.size,
            result.length,
          );
          const pages = [
            <Page key={index} {...commonProps} pageNumber={index + 1} />,
          ];

          if (!isSingle) {
            relativeAbsoluteMapToSet.set(
              relativeAbsoluteMapToSet.size,
              result.length,
            );
            pages.push(
              <Page key={index} {...commonProps} pageNumber={index + 2} />,
            );
          }

          result.push(pages);

          continue;
        }

        if (pageWidths[index].type === 2) {
          // there's only 1 pdf page representing 2 real pages, so render twice in order to fake the page split
          relativeAbsoluteMapToSet.set(relativeAbsoluteMapToSet.size, index);
          relativeAbsoluteMapToSet.set(relativeAbsoluteMapToSet.size, index);

          result.push([
            <Page
              key={`${index}-left`}
              {...commonProps}
              className="left"
              pageNumber={index + 1}
            />,
            <Page
              key={`${index}-right`}
              {...commonProps}
              className="right"
              pageNumber={index + 1}
            />,
          ]);

          continue;
        }

        if (pageWidths[index].type === 1) {
          relativeAbsoluteMapToSet.set(relativeAbsoluteMapToSet.size, index);

          result.push(
            <Page key={index} {...commonProps} pageNumber={index + 1} />,
          );

          continue;
        }
      }
    }

    if (relativeAbsoluteMap.current.size === 0) {
      relativeAbsoluteMap.current = relativeAbsoluteMapToSet;
      absoluteRelativeMap.current = new Map(
        [...relativeAbsoluteMapToSet.entries()]
          .reverse()
          .map(([k, v]) => [v, k]),
      );
    }

    return result;
  }, [allPageWidthsSame, pageWidths, pdfPages]);

  const lastPageLength = useMemo(() => {
    const last = pages[pages.length - 1];
    return Array.isArray(last) ? last.length : 1;
  }, [pages]);

  const flattenedPages = useMemo(() => pages.flat(), [pages]);

  const setPageIndex = useCallback(
    (i: number) =>
      _setPageIndex(Math.max(Math.min(i, flattenedPages.length - 1), 0)),
    [flattenedPages],
  );

  const setPageVariation = useCallback<SetPageVariation>(
    (direction) => {
      const abs = relativeAbsoluteMap.current.get(pageIndex);
      const newI =
        abs === undefined
          ? 0
          : absoluteRelativeMap.current.get(
              abs + (direction === "increment" ? 1 : -1),
            );
      if (newI !== undefined) setPageIndex(newI);
    },
    [pageIndex, setPageIndex],
  );

  const getProgress = useCallback<GetProgress>(() => {
    if (length === 0) {
      return 0;
    }

    if (mode === "single") {
      return (pageIndex / Math.max(length - 1, 0)) * 100;
    }

    /*
    if (mode === "double") {
      return (
        ((relativeAbsoluteMap.current.get(pageIndex) ?? 0) /
          (pages.length - 1)) *
        100
      );
    }
    */

    return 0;
  }, [length, mode, pageIndex, pages.length]);

  const absoluteIndex = useMemo(
    () => relativeAbsoluteMap.current.get(pageIndex) ?? 0,
    [pageIndex],
  );

  // dynamic width handled inline on container

  const onLoadSuccess = useCallback((proxy: PDFDocumentProxy) => {
    setPdfPages(proxy.numPages);

    Promise.all(
      [...new Array(proxy.numPages)].map((_, index) =>
        proxy.getPage(index + 1),
      ),
    ).then((pages) => {
      const views = pages.map(
        ({ view }) => view as [number, number, number, number],
      );

      const firstPageWidth = views[0][2];

      setDocumentWidth(firstPageWidth);
      setDocumentHeight(views[0][3]);

      let relativeLength = 0;

      setPageWidths(
        views.map(([_x, _y, width, height], index) => {
          if (index === 0 || width < firstPageWidth * 1.5) {
            relativeLength += 1;

            return { width, height, type: 1 };
          }

          relativeLength += 2;

          return { width, height, type: 2 };
        }),
      );

      setLength(relativeLength);

      const promises: Promise<TextContent>[] = [];

      for (let index = 0; index < pages.length; index++) {
        promises.push(pages[index].getTextContent());
      }

      return Promise.all(promises);
    });
  }, []);

  return (
    <>
      <div className="book-slate">
        {!loaded && (
          <Box
            width="100%"
            height="100%"
            display="flex"
            justifyContent="center"
            alignItems="center"
            position="absolute"
          >
            Loading...
          </Box>
        )}
        <DragNZoom
          {...{ zoom, setZoom }}
          dimensions={
            documentWidth && documentHeight
              ? {
                  height: documentHeight,
                  width:
                    documentWidth *
                    (Array.isArray(pages[absoluteIndex])
                      ? pages[absoluteIndex].length
                      : 1),
                }
              : null
          }
        >
          <Document
            className="book-document"
            file={url}
            inputRef={doc}
            loading={<></>}
            onLoadError={throwError}
            onSourceError={throwError}
            {...{ onLoadSuccess }}
          >
            {mode === "single" && pages[absoluteIndex]}
          </Document>
        </DragNZoom>
        <OverlayControls
          {...{
            setPageVariation,
          }}
          disabledVariations={{
            decrement: !loaded || pageIndex <= 0,
            increment: !loaded || pageIndex >= length - lastPageLength,
          }}
        />
      </div>
      <div className="book-controlsContainer">
        <Controls
          {...{
            loaded,
            pageIndex,
            setPageIndex,
            maxPageIndex: flattenedPages.length - 1,
            getProgress,
            length,
            url,
            fullscreen,
            setFullscreen,
            zoom,
            setZoom,
            mode,
            setMode,
          }}
        />
      </div>
    </>
  );
}
