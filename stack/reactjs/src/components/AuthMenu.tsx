import { AccountCircle, AppRegistration, Login } from "@mui/icons-material";
import { Box, Chip, ListItemAvatar, ListItemButton, ListItemText } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../allauth/auth";
import { useActiveRole } from "../context/ActiveRoleContext";
import { getRoleConfig } from "../utils/roleUtils";

interface PermissionProps {
  to: string;
  icon?: string | React.ReactNode;
  name?: string | React.ReactNode;
}

export const NavBarItem: React.FC<PermissionProps> = (props) => {
  const location = useLocation();
  const isActive = location.pathname === props.to;
  return props.to.indexOf("http://") === 0 ||
    props.to.indexOf("https://") === 0 ? (
    <ListItemButton dense={true} selected={isActive} alignItems={"center"}>
      {props.icon && (
        <ListItemAvatar sx={{ minWidth: 40 }}>{props.icon}</ListItemAvatar>
      )}
      <a
        target={"_blank"}
        style={{ textDecoration: "none", fontSize: 12 }}
        href={props.to}
      >
        {props.name}
      </a>
    </ListItemButton>
  ) : (
    <ListItemButton
      dense={true}
      component={Link}
      to={props.to}
      selected={isActive}
      alignItems={"center"}
    >
      {props.icon && (
        <ListItemAvatar sx={{ minWidth: 40 }}>{props.icon}</ListItemAvatar>
      )}
      {typeof props.name === 'string' ? (
        <ListItemText primary={props.name} />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {props.name}
        </Box>
      )}
    </ListItemButton>
  );
};

export default function AuthMenu() {
  const me = useAuth()?.data?.user;
  const { activeRole } = useActiveRole();

  return (
    <div id={"AuthMenu"}>
      {me && me?.id ? (
        <NavBarItem
          to="/my-profile"
          icon={<AccountCircle fontSize={"small"} />}
          name={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span>My Account</span>
              {activeRole && (
                <Chip
                  size="small"
                  label={getRoleConfig(activeRole).label}
                  color={getRoleConfig(activeRole).color}
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              )}
            </Box>
          }
        />
      ) : (
        <React.Fragment>
          <NavBarItem
            to="/account/login"
            icon={<Login fontSize={"small"} color={"secondary"} />}
            name="Sign In"
          />
          <NavBarItem
            to="/account/signup"
            icon={<AppRegistration color={"secondary"} fontSize={"small"} />}
            name="Sign Up"
          />
        </React.Fragment>
      )}
    </div>
  );
}
