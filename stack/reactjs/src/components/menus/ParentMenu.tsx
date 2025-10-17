import {
    AccountCircle as AccountCircleIcon,
    Dashboard as DashboardIcon,
    Notifications as NotificationsIcon,
    Payment as PaymentIcon,
    Person as PersonIcon,
    Sports as SportsIcon
} from "@mui/icons-material";
import { ListItemAvatar, ListItemButton, ListItemText } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";

const ParentMenu: React.FC = () => {
    const location = useLocation();

    return (
        <div id="ParentMenuListItems">
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

            {/* Users */}
            <ListItemButton
                component={Link}
                to="/users"
                selected={location.pathname === "/users"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <PersonIcon fontSize="small" />
                </ListItemAvatar>
                <ListItemText primary="Users" />
            </ListItemButton>

            {/* Payments */}
            <ListItemButton
                component={Link}
                to="/payments"
                selected={location.pathname === "/payments"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <PaymentIcon fontSize="small" />
                </ListItemAvatar>
                <ListItemText primary="Payments" />
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

export default ParentMenu;
