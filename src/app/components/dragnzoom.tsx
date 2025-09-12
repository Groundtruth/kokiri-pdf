import { useRef, ReactNode, useEffect, useCallback } from "react";

import { useSpring, animated, to } from "@react-spring/web";

import {
  createUseGesture,
  dragAction,
  pinchAction,
  scrollAction,
} from "@use-gesture/react";
import { zoomLevels } from "./controls";
import { OnResizeCallback, useResizeDetector } from "react-resize-detector";

type Dimensions = { width: number; height: number } | null;

const useGesture = createUseGesture([dragAction, pinchAction, scrollAction]);

const spacing = 8 * 11 * 2;

const calculateScale = ({
  width,
  height,
  dimensions,
}: {
  width: number;
  height: number;
  dimensions: NonNullable<Dimensions>;
}) =>
  width >= height
    ? height / (dimensions.height + spacing)
    : width / (dimensions.width + spacing);

document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("gesturechange", (e) => e.preventDefault());

export default function DragNZoom({
  children,
  dimensions,
  zoom: externalZoom,
  setZoom,
}: {
  children: ReactNode;
  dimensions: Dimensions;
  zoom: number;
  setZoom: (newScale: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [style, api] = useSpring(() => ({
    from: {
      x: 0,
      y: 0,
      scale: 1,
      zoom: 1,
      dimensions: { width: 0, height: 0 },
    },
  }));

  const calculateInitialScale = useCallback<OnResizeCallback>(
    ({ width, height }) => {
      if (height && width && dimensions) {
        api.set({
          scale: calculateScale({
            width,
            height,
            dimensions,
          }),
          dimensions,
        });
      }
    },
    [api, dimensions],
  );

  const { width: pageWidth, height: pageHeight } = useResizeDetector({
    targetRef: containerRef,
    onResize: calculateInitialScale,
    refreshMode: "debounce",
    refreshRate: 500,
  });

  useEffect(() => {
    if (dimensions && pageWidth && pageHeight) {
      calculateInitialScale({
        width: pageWidth,
        height: pageHeight,
        entry: {} as ResizeObserverEntry,
      });
    }
  }, [calculateInitialScale, pageWidth, pageHeight, dimensions]);

  const constrainPan = useCallback(
    ({ x, y, zoom }: { x: number; y: number; zoom: number }) => {
      if (dimensions) {
        const xEndBound = (dimensions.width * style.scale.get() * zoom) / 2;
        const xStartBound = -xEndBound;
        const yEndBound = (dimensions.height * style.scale.get() * zoom) / 2;
        const yStartBound = -yEndBound;

        return zoom <= 1
          ? { x: 0, y: 0 }
          : {
              x:
                x <= xStartBound
                  ? xStartBound
                  : x >= xEndBound
                    ? xEndBound
                    : undefined,
              y:
                y <= yStartBound
                  ? yStartBound
                  : y >= yEndBound
                    ? yEndBound
                    : undefined,
            };
      }
    },
    [dimensions, style.scale],
  );

  useEffect(() => {
    if (dimensions) {
      api.start({
        ...constrainPan({
          zoom: externalZoom,
          x: style.x.goal,
          y: style.x.goal,
        }),
        zoom: externalZoom,
      });
    }
  }, [api, externalZoom, dimensions, style, constrainPan]);

  useGesture(
    {
      onDrag: ({ pinching, cancel, offset: [x, y] }) => {
        if (pinching) {
          cancel();
        }

        api.start({ x, y });
      },
      onDragEnd: ({ offset: [x, y] }) => {
        const zoom =
          typeof style.zoom.animation.to === "number"
            ? style.zoom.animation.to
            : 1;

        api.start(constrainPan({ x, y, zoom }));
      },
      onPinch: ({
        origin: [originX, originY],
        first,
        movement: [displacement],
        offset: [zoom],
        memo,
      }) => {
        if (first) {
          const { width, height, x, y } = (
            pageRef.current as HTMLDivElement
          ).getBoundingClientRect() as NonNullable<DOMRect>;

          const tx = originX - (x + width / 2);
          const ty = originY - (y + height / 2);

          memo = [style.x.get(), style.y.get(), tx, ty];
        }

        const x = memo[0] - displacement * memo[2];
        const y = memo[1] - displacement * memo[3];

        setZoom(zoom);
        api.start({ x, y, zoom });

        return memo;
      },
      onPinchEnd: ({ movement: [displacement], offset: [zoom], memo }) => {
        const x = memo[0] - displacement * memo[2];
        const y = memo[1] - displacement * memo[3];

        setZoom(zoom);
        api.start(constrainPan({ x, y, zoom }));
      },
    },
    {
      target: pageRef,
      drag: {
        from: () => [style.x.get(), style.y.get()],
        pointer: {
          touch: true,
        },
      },
      pinch: {
        scaleBounds: {
          min: zoomLevels[0].value,
          max: zoomLevels[zoomLevels.length - 1].value,
        },
        rubberband: true,
        pointer: {
          touch: true,
        },
      },
    },
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      ref={containerRef}
    >
      <animated.div
        style={{
          touchAction: "none",
          x: style.x,
          y: style.y,
        }}
        ref={pageRef}
      >
        <animated.div
          style={{
            touchAction: "none",
            display: "inline-flex",
            scale: to([style.scale, style.zoom], (scale, zoom) => scale * zoom),
          }}
        >
          {children}
        </animated.div>
      </animated.div>
    </div>
  );
}
