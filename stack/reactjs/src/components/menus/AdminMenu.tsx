import {
    AccountCircle as AccountCircleIcon,
    Dashboard as DashboardIcon,
    Description as DescriptionIcon,
    Notifications as NotificationsIcon,
    Palette as PaletteIcon,
    Payment as PaymentIcon,
    Person as PersonIcon,
    School as SchoolIcon,
    Share as ShareIcon,
    SmartToy as SmartToyIcon,
    Sports as SportsIcon
} from "@mui/icons-material";
import { ListItemAvatar, ListItemButton, ListItemText } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";

const AdminMenu: React.FC = () => {
    const location = useLocation();

    return (
        <div id="AdminMenuListItems">
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

            {/* Courses */}
            <ListItemButton
                component={Link}
                to="/courses"
                selected={location.pathname === "/courses"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <SchoolIcon fontSize="small" />
                </ListItemAvatar>
                <ListItemText primary="Courses" />
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

            {/* Prompt Templates */}
            <ListItemButton
                component={Link}
                to="/prompt-templates"
                selected={location.pathname === "/prompt-templates"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <DescriptionIcon fontSize="small" />
                </ListItemAvatar>
                <ListItemText primary="Prompt Templates" />
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

            {/* Shares */}
            <ListItemButton
                component={Link}
                to="/shares"
                selected={location.pathname === "/shares"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <ShareIcon fontSize="small" />
                </ListItemAvatar>
                <ListItemText primary="Shares" />
            </ListItemButton>

            {/* Branding Settings - Admin Only */}
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

            {/* Prompt Tester */}
            <ListItemButton
                component={Link}
                to="/prompt-tester"
                selected={location.pathname === "/prompt-tester"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <DescriptionIcon fontSize="small" />
                </ListItemAvatar>
                <ListItemText primary="Prompt Tester" />
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

export default AdminMenu;
