import { Palette as PaletteIcon } from "@mui/icons-material";
import { ListItemAvatar, ListItemButton, ListItemText } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useNavDrawer } from "../NavDrawerProvider";
import { useActiveRole } from "../context/ActiveRoleContext";
import { NAVITEMS } from "../object-actions/types/types";
import MuiIcon from "./MuiIcon";

interface ContentTypesHomeProps {
  showLine2?: boolean;
}

const ContentMenu: React.FC<ContentTypesHomeProps> = ({ showLine2 = undefined }) => {
  const location = useLocation();
  const { navModelTypes } = useNavDrawer();
  const { activeRole, hasRole } = useActiveRole();

  return (<div id={"OAMenuListItems"}>
    {NAVITEMS.map((item) => {
      const type = item.model_type ? item.model_type : "contenttype";
      if (navModelTypes.indexOf(type) === -1) return null;

      // Filter by role if roles are defined for this item
      if (item.roles && activeRole && !item.roles.includes(activeRole)) {
        return null;
      }

      return (
        <ListItemButton
          key={`ContentMenu-${item.segment}`}
          component={Link}
          to={`/${item.segment}`}
          selected={location.pathname === `/${item.segment}`}
        >
          {item.icon && <ListItemAvatar style={{ display: "flex" }}><MuiIcon fontSize={"small"} icon={item.icon} /></ListItemAvatar>}
          <ListItemText primary={item.plural} />
        </ListItemButton>
      );
    })}

    {/* Branding Settings - Admin Only */}
    {hasRole('admin') && (
      <ListItemButton
        component={Link}
        to="/admin/branding"
        selected={location.pathname === "/admin/branding"}
      >
        <ListItemAvatar style={{ display: "flex" }}>
          <PaletteIcon fontSize="small" />
        </ListItemAvatar>
        <ListItemText primary="Branding" />
      </ListItemButton>
    )}
  </div>
  );
};
export default ContentMenu;
