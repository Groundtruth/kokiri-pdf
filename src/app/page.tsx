"use client";

import { ThemeProvider } from "@emotion/react";
import { createTheme } from "@mui/material";
import fscreen from "fscreen";
import dynamic from "next/dynamic";
import { useLayoutEffect, useState } from "react";

const Book = dynamic(() => import("./components/book.js"), {
  ssr: false,
});

export default function Page() {
  const [fullscreen, setFullscreen] = useState(false);
  const theme = createTheme({
    palette: {
      primary: {
        main: "#1f1f1fff",
      },
      secondary: {
        main: "#dbdbdbff",
      },
    },
  });

  useLayoutEffect(() => {
    if (document.readyState === "complete") {
      if (fullscreen) {
        fscreen.requestFullscreen(document.body);
      }

      if (fscreen.fullscreenElement && !fullscreen) {
        fscreen.exitFullscreen();
      }

      const handler = () => {
        if (!fscreen.fullscreenElement && fullscreen) {
          setFullscreen(false);
        }
      };

      fscreen.addEventListener("fullscreenchange", handler, { passive: true });

      return () =>
        fscreen.removeEventListener("fullscreenchange", handler, {
          passive: true,
        });
    }
  }, [fullscreen]);

  return (
    <ThemeProvider theme={theme}>
      <Book
        url={"./kokiri.pdf"}
        fullscreen={fullscreen}
        setFullscreen={setFullscreen}
      />
    </ThemeProvider>
  );
}
