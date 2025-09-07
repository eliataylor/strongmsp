import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Collapse, Divider, List, ListItemButton, ListItemText } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import FontSelector from "src/theme/FontSelector";
import ThemeSwitcher from "src/theme/ThemeSwitcher";
import AuthMenu from "../components/AuthMenu";
import ContentMenu from "./ContentMenu";

const AllMenus = () => {
  const [objectsOpen, setObjectsOpen] = React.useState(false);
  const location = useLocation();

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
      <ThemeSwitcher />
      <FontSelector />


    </React.Fragment >
  );
};
export default AllMenus;
