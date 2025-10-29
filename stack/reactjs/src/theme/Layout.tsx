import { Box } from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "src/components/Footer";
import PublicHeader from "src/components/PublicHeader";
import Logo from "./Logo";

const Layout: React.FC = () => {
  const location = useLocation();
  const [snack, showSnackBar] = React.useState("");

  const closeSnackbar = (
    event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }

    showSnackBar("");
  };

  function formatPathnameToDocTitle(pathname: string) {
    // Remove leading and trailing slashes, then split by remaining slashes
    const segments = pathname.replace(/^\/|\/$/g, "").split("/");

    // Capitalize each segment
    const capitalizedSegments = segments.map(segment => {
      if (!segment) return "";
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    });

    // Reverse the order and join with spaces
    return capitalizedSegments.reverse().join(" ").trim();
  }

  useEffect(() => {
    document.title = formatPathnameToDocTitle(location.pathname);
  }, [location.pathname]);

  return (
    <React.Fragment>
      <Snackbar
        open={snack.length > 0}
        autoHideDuration={5000}
        onClose={closeSnackbar}
        message={snack}
      />

      <main style={{ position: 'relative' }}>
        <PublicHeader />

        <Box id="layout-container" style={{ position: 'relative', zIndex: 20, minHeight: 'calc(100vh - 100px)' }} >
          <Outlet />
        </Box>

        <div id="logo-watermark"
          style={{
            position: 'fixed',
            filter: 'grayscale(100%)',
            pointerEvents: 'none',
            zIndex: 0, top: '-9%', left: '-8%',
            width: '120%', height: '120%', opacity: 0.02
          }}>
          <Logo height={window.innerHeight * 1.2} />
        </div>

        <Footer />
      </main>


    </React.Fragment>
  );
};

export default Layout;
