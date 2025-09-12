import { useEffect } from "react";
import { SetPageVariation } from "./book";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { Box, IconButton, useTheme } from "@mui/material";
import { grey } from "@mui/material/colors";

export default function OverlayControls({
  setPageVariation,
  disabledVariations,
}: {
  setPageVariation: SetPageVariation;
  disabledVariations: {
    decrement: boolean;
    increment: boolean;
  };
}) {
  const theme = useTheme();
  const styles = {
    iconButton: {
      color: "black",
      pointerEvents: "all",
      width: "3.6rem",
      height: "3.6rem",
      border: `solid 0.1rem ${grey[500]}`,
      backgroundColor: "#c4c4c481",
      opacity: 1,
      "&:hover, &:focus": {
        backgroundColor: "#ffffffbd",
      },
      "&.Mui-disabled": {
        backgroundColor: grey[300],
        color: grey[600],
      },
      [theme.breakpoints.down("md")]: {
        width: "4.4rem",
        height: "4.4rem",
      },
    },
    layout: {
      pointerEvents: "none",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "absolute",
      top: "0",
      right: theme.spacing(3),
      bottom: "0",
      left: theme.spacing(3),
    },
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && !disabledVariations.decrement) {
        setPageVariation("decrement");
      }

      if (event.key === "ArrowRight" && !disabledVariations.increment) {
        setPageVariation("increment");
      }
    };

    document.addEventListener("keydown", handler);

    return () => document.removeEventListener("keydown", handler);
  }, [
    disabledVariations.decrement,
    disabledVariations.increment,
    setPageVariation,
  ]);

  return (
    <Box sx={styles.layout}>
      <IconButton
        sx={styles.iconButton}
        disabled={disabledVariations.decrement}
        onClick={() => setPageVariation("decrement")}
      >
        <ChevronLeft
          color={disabledVariations.decrement ? "inherit" : "primary"}
          viewBox="4.3 4.3 14.4 14.4"
        />
      </IconButton>
      <IconButton
        sx={styles.iconButton}
        disabled={disabledVariations.increment}
        onClick={() => setPageVariation("increment")}
      >
        <ChevronRight
          color={disabledVariations.increment ? "inherit" : "primary"}
          viewBox="4.3 4.3 14.4 14.4"
        />
      </IconButton>
    </Box>
  );
}
