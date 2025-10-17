import {
    AccountCircle as AccountCircleIcon,
    Dashboard as DashboardIcon,
    Notifications as NotificationsIcon
} from "@mui/icons-material";
import { ListItemAvatar, ListItemButton, ListItemText } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";

const AthleteMenu: React.FC = () => {
    const location = useLocation();

    return (
        <div id="AthleteMenuListItems">
            {/* Dashboard */}
            <ListItemButton
                component={Link}
                to="/dashboard"
                selected={location.pathname === "/dashboard"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <DashboardIcon fontSize="small" />
                </ListItemAvatar>
                <ListItemText primary="Dashboard" />
            </ListItemButton>

            {/* Notifications */}
            <ListItemButton
                component={Link}
                to="/notifications"
                selected={location.pathname === "/notifications"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <NotificationsIcon fontSize="small" />
                </ListItemAvatar>
                <ListItemText primary="Notifications" />
            </ListItemButton>

            {/* My Account */}
            <ListItemButton
                component={Link}
                to="/my-profile"
                selected={location.pathname === "/my-profile"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <AccountCircleIcon fontSize="small" />
                </ListItemAvatar>
                <ListItemText primary="My Account" />
            </ListItemButton>
        </div>
    );
};

export default AthleteMenu;
