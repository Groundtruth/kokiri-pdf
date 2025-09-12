import { Box } from "@mui/material";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

export const metadata = {
  title: "Kōkiri",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NZ">
      <style precedence="global" href="RootLayout">{`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
      <body>
        <Box
          width="100vw"
          maxHeight="100vh"
          minHeight={0}
          display="flex"
          flexDirection="column"
          height="100vh"
        >
          {children}
        </Box>
      </body>
    </html>
  );
}
