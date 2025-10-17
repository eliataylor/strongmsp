import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, Box, Grid, ListItemButton, Typography } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import { styled } from "@mui/material/styles";
import React, { useContext, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useNavDrawer } from "../NavDrawerProvider";
import Logo from "./Logo";
// import TrackingConsent from "../components/TrackingConsent"; // enable this if your publishing features in an area that require a cookie consent
import { useAuth } from "../allauth/auth";
import AnonymousMenu from "../components/menus/AnonymousMenu";
import RoleBasedMenu from "../components/RoleBasedMenu";
import { FadedPaper, StyledDrawer } from "./StyledFields";
import { ThemeContext } from "./ThemeContext";

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1, 0.2, 0, 1),
  justifyContent: "space-between"
}));

const Layout: React.FC = () => {
  const location = useLocation();
  const { navDrawerWidth, setNavDrawerWidth, isMobile } = useNavDrawer();
  const auth = useAuth();
  const { brandingSettings } = useContext(ThemeContext);
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

  const handleDrawerOpen = () => {
    setNavDrawerWidth(300);
  };

  const handleDrawerClose = () => {
    setNavDrawerWidth(0);
  };

  const isHomePage = (): boolean => {
    return location.pathname === "/";
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

      {/* enable this if your publishing features in an area that require a cookie consent
      <TrackingConsent />
      */}

      <Grid container justifyContent={"space-around"} flexWrap={"nowrap"}>
        {isMobile === false && !isHomePage() && (
          <div style={{ position: 'relative' }}>
            <Grid
              aria-label={"Menu Mounted"}
              item
              sx={{ mt: 1 }}
              style={{ maxWidth: 240, minWidth: 181, zIndex: 2, position: 'relative' }}
            >
              <Box sx={{ marginBottom: 1 }}>
                <ListItemButton dense={true} alignItems={"center"}>
                  <Logo height={33} />
                  <Link to={`/`} style={{ textDecoration: "none", marginLeft: 10, fontSize: 12, fontWeight: 800 }}>
                    Strong Mind Strong Performance
                  </Link>
                </ListItemButton>
              </Box>

              {auth?.data?.user ? <RoleBasedMenu /> : <AnonymousMenu />}

              {/* Powered By Footer - Only show if custom logo is active */}
              {brandingSettings?.customLogoBase64 && (
                <Box sx={{
                  mt: 'auto',
                  px: 1,
                  py: 2,
                  textAlign: 'center',
                  borderTop: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Powered By
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Logo useCustom={false} height={24} />
                  </Box>
                </Box>
              )}

            </Grid>
            <FadedPaper style={{ position: 'absolute', top: 0, left: 0, minHeight: '100vh', maxHeight: '100vh', width: '100%', padding: 0, margin: 0, zIndex: 0 }} />
          </div>)
        }

        <Grid item flexGrow={1}>
          {isMobile === true && !isHomePage() &&
            <AppBar position="fixed" color={"default"}>
              <Grid
                container
                justifyContent={"space-between"}
                alignItems={"center"}
                padding={1}
                spacing={2}
              >
                <Grid item>
                  <Link to={"/"}>
                    <Logo height={35} />
                  </Link>
                </Grid>
                <Grid item style={{ flexGrow: 1 }}></Grid>
                <Grid item>
                  <IconButton
                    size={"large"}
                    aria-label="Open Drawer"
                    onClick={handleDrawerOpen}
                  >
                    <MenuIcon color={"secondary"} />
                  </IconButton>
                </Grid>
              </Grid>
            </AppBar>}
          <Box
            style={{
              width: "100%",
              margin: `${!isMobile ? 0 : "100px"} auto 0 auto`,
              padding: "1%",
              maxWidth: 1224
            }}
          >
            <Outlet />
          </Box>
        </Grid>
      </Grid>

      {isMobile === true && !isHomePage() &&
        <StyledDrawer
          id={"MobileDrawer"}
          anchor="right"
          variant="temporary"
          open={navDrawerWidth > 0}
          ModalProps={{
            keepMounted: !isMobile
          }}
          onClose={handleDrawerClose}
          sx={{
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: navDrawerWidth
            }
          }}
        >
          <DrawerHeader>
            <Logo height={34} />
            <IconButton aria-label={"Close Drawer"} onClick={handleDrawerClose}>
              <ChevronRightIcon />
            </IconButton>
          </DrawerHeader>
          {auth?.data?.user ? <RoleBasedMenu /> : <AnonymousMenu />}
        </StyledDrawer>
      }

    </React.Fragment>
  );
};

export default Layout;
