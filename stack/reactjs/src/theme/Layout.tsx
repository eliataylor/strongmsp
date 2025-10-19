import { Box } from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "src/components/Footer";
import PublicHeader from "src/components/PublicHeader";

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

      <PublicHeader />

      <Box id="layout-container" style={{ zIndex: 20, minHeight: 'calc(100vh - 100px)' }} >
        <Outlet />
      </Box>

      <Footer />

    </React.Fragment>
  );
};

export default Layout;
