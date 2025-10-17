import {
    AccountCircle as AccountCircleIcon,
    Dashboard as DashboardIcon,
    Notifications as NotificationsIcon,
    SmartToy as SmartToyIcon,
    Sports as SportsIcon
} from "@mui/icons-material";
import { ListItemAvatar, ListItemButton, ListItemText } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";

const CoachMenu: React.FC = () => {
    const location = useLocation();

    return (
        <div id="CoachMenuListItems">
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

            {/* Agent Responses */}
            <ListItemButton
                component={Link}
                to="/agent-responses"
                selected={location.pathname === "/agent-responses"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <SmartToyIcon fontSize="small" />
                </ListItemAvatar>
                <ListItemText primary="Agent Responses" />
            </ListItemButton>

            {/* Coach Content */}
            <ListItemButton
                component={Link}
                to="/coach-content"
                selected={location.pathname === "/coach-content"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <SportsIcon fontSize="small" />
                </ListItemAvatar>
                <ListItemText primary="Coach Content" />
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

export default CoachMenu;
