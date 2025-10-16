import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Box, Collapse, Divider, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import AuthMenu from "../components/AuthMenu";
import Logo from "../theme/Logo";
import { ThemeContext } from "../theme/ThemeContext";
import ContentMenu from "./ContentMenu";

const AllMenus = () => {
  const [objectsOpen, setObjectsOpen] = React.useState(false);
  const location = useLocation();
  const { brandingSettings } = useContext(ThemeContext);

  const handleClick = () => {
    setObjectsOpen(!objectsOpen);
  };

  return (
    <React.Fragment>
      <List id={"AllMenus"} dense={true} style={{ marginBottom: 0, paddingBottom: 0 }}>
        <AuthMenu />

        <Divider
          sx={{
            marginTop: 1,
            backgroundColor: "primary.dark"
          }}
        />

        <ListItemButton
          dense={true}
          id={"OAMenuButton"}
          style={{ justifyContent: "space-between" }}
          onClick={handleClick}
        >
          <ListItemText primary="Your Content" />
          {objectsOpen ? (
            <ExpandLess fontSize={"small"} />
          ) : (
            <ExpandMore fontSize={"small"} />
          )}
        </ListItemButton>

        <Collapse in={objectsOpen} timeout="auto" unmountOnExit>
          <ContentMenu />

          <ListItemButton
            component={Link}
            to={`/prompt-tester`}
            selected={location.pathname === `/prompt-tester`}
          >
            <ListItemText primary={'Prompt Tester'} />
          </ListItemButton>

        </Collapse>

      </List>

      <Divider
        sx={{ backgroundColor: "primary.dark" }}
      />

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

    </React.Fragment >
  );
};
export default AllMenus;
