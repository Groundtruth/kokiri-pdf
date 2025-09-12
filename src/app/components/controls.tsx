import { useState, useEffect, useMemo, useCallback } from "react";
import fscreen from "fscreen";
import { GetProgress, Mode } from "./book";
import {
  Box,
  Container,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import {
  AddCircleOutlineOutlined,
  Download,
  Fullscreen,
  FullscreenExit,
  RemoveCircleOutlineOutlined,
} from "@mui/icons-material";
import { lightBlue } from "@mui/material/colors";

export const zoomLevels = [
  { value: 1, label: "100%" },
  { value: 1.5, label: "150%" },
  { value: 1.75, label: "175%" },
  { value: 2, label: "200%" },
  { value: 4, label: "400%" },
  { value: 8, label: "800%" },
];

const findNearestZoomIndex = (zoom: number) =>
  zoomLevels.reduce<{ value: number; index: number }>(
    (acc, { value }, index) =>
      Math.abs(value - zoom) < Math.abs(acc.value - zoom)
        ? { value, index }
        : acc,
    { value: 1, index: zoomLevels.findIndex(({ value }) => value === 1) },
  ).index;

export default function Controls({
  loaded,
  pageIndex,
  setPageIndex,
  maxPageIndex,
  length,
  setMode,
  url,
  mode,
  fullscreen,
  setFullscreen,
  zoom: externalZoom,
  setZoom,
  getProgress,
}: {
  loaded: boolean;
  pageIndex: number;
  setPageIndex: (newPage: number) => void;
  maxPageIndex: number;
  length: number;
  setMode: (mode: Mode) => void;
  url: string;
  mode: "single"; // | "double";
  fullscreen: boolean;
  setFullscreen: (setState: (oldState: boolean) => boolean) => void;
  zoom: number;
  setZoom: (newZoom: number) => void;
  getProgress: GetProgress;
}) {
  const theme = useTheme();

  const styles = {
    pageInput: {
      width: "4.4rem",
      "& .MuiInputBase-input": {
        paddingLeft: 0,
        paddingRight: 0,
        textAlign: "center",
        color: theme.palette.secondary.main,
      },
    },
    active: {
      "&.MuiIconButton-colorInherit": {
        color: lightBlue,
      },
    },
    layout: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "16px",
      position: "relative",
    },
    controls: {
      display: "flex",
    },
    centerControlsLayout: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      pointerEvents: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ['down("md")']: {
        position: "unset",
      },
    },
    centerControls: {
      pointerEvents: "all",
      display: "flex",
      alignItems: "baseline",
    },
    main: {
      width: "100%",
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flex: "0 0 100%",
    },
    totalSpan: {
      margin: theme.spacing(0, 1),
    },
    select: {
      margin: theme.spacing(0, 2),
      width: "11.5rem",
      color: theme.palette.secondary.main,
    },
    linearProgress: {
      "& .MuiLinearProgress-barColorPrimary": {
        backgroundColor: "#2986ff",
      },
    },
  };

  const zoom = useMemo(() => externalZoom, [externalZoom]);
  const [localPageNumber, setLocalPageNumber] = useState<number | null>(
    pageIndex + 1,
  );

  const handlePageInput = useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur();

    if (localPageNumber !== null) setPageIndex(localPageNumber - 1);
  }, [localPageNumber, setPageIndex]);

  useEffect(() => {
    setLocalPageNumber(Math.min(pageIndex + 1, length));
  }, [pageIndex, length]);

  return (
    <Box sx={styles.main}>
      <Container>
        <LinearProgress
          sx={styles.linearProgress}
          variant="determinate"
          value={getProgress()}
        />
        <Box sx={styles.layout}>
          <Box sx={styles.controls}></Box>
          <Box sx={styles.centerControlsLayout}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handlePageInput();
              }}
            >
              <Box sx={styles.centerControls}>
                <TextField
                  disabled={!loaded}
                  color="secondary"
                  value={localPageNumber ?? ""}
                  inputMode="numeric"
                  InputProps={{ inputProps: { min: 1, max: maxPageIndex + 1 } }}
                  sx={styles.pageInput}
                  onChange={(event) => {
                    const num = parseInt(event.target.value);
                    if (!num || (num >= 1 && num <= maxPageIndex + 1))
                      setLocalPageNumber(num || null);
                  }}
                  onBlur={handlePageInput}
                />
                <Typography color="secondary" variant="body1">
                  <span style={styles.totalSpan}>/</span>
                  {length}
                </Typography>
              </Box>
            </form>
          </Box>
          <Box sx={styles.controls}>
            <IconButton
              color="secondary"
              disabled={
                !loaded ||
                zoom >= zoomLevels[zoomLevels.length - 1].value ||
                zoomLevels.findIndex(({ value }) => value === zoom) ===
                  zoomLevels.length - 1
              }
              onClick={() =>
                setZoom(zoomLevels[findNearestZoomIndex(zoom) + 1].value)
              }
            >
              <AddCircleOutlineOutlined />
            </IconButton>
            <IconButton
              color="secondary"
              disabled={
                !loaded ||
                zoom <= zoomLevels[0].value ||
                zoomLevels.findIndex(({ value }) => value === zoom) === 0
              }
              onClick={() =>
                setZoom(zoomLevels[findNearestZoomIndex(zoom) - 1].value)
              }
            >
              <RemoveCircleOutlineOutlined />
            </IconButton>
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Select
                disabled={!loaded}
                color="secondary"
                sx={styles.select}
                value={zoom}
                onChange={({ target: { value } }) => {
                  if (typeof value === "number") {
                    setZoom(value);
                  }
                }}
                MenuProps={{
                  anchorOrigin: {
                    vertical: "top",
                    horizontal: "center",
                  },
                  transformOrigin: {
                    vertical: "bottom",
                    horizontal: "center",
                  },
                }}
              >
                {[
                  ...zoomLevels,
                  ...(zoomLevels.some(({ value }) => value === zoom)
                    ? []
                    : [
                        {
                          value: zoom,
                          label: `${Math.round(zoom * 100)}%`,
                          hidden: true,
                        },
                      ]),
                ].map(({ value, label, ...props }, key) => (
                  <MenuItem
                    key={key}
                    value={value}
                    style={{
                      display: "hidden" in props ? "none" : "undefined",
                    }}
                  >
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <IconButton
              disabled={!loaded}
              color="secondary"
              component="a"
              href={url}
              download={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download />
            </IconButton>

            <IconButton
              color="secondary"
              disabled={!fscreen.fullscreenEnabled || !loaded}
              onClick={() => setFullscreen((oldFullscreen) => !oldFullscreen)}
            >
              {fullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
