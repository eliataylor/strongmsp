import {
    Dashboard as DashboardIcon,
    Description as DescriptionIcon,
    Notifications as NotificationsIcon,
    Palette as PaletteIcon,
    Payment as PaymentIcon,
    Person as PersonIcon,
    SupportAgent as SportsIcon
} from "@mui/icons-material";
import { ListItemAvatar, ListItemButton, ListItemText } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import RoleSwitchPrompt from "src/screens/RoleSwitchPrompt";
import ProfileIcon from "src/theme/icons/ProfileIcon";
export type MenuLayout = 'drawer' | 'footer' | 'header';
export interface MenuProps {
    layout?: MenuLayout;
}

const AdminMenu: React.FC<MenuProps> = ({ layout = 'drawer' }) => {
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
                <ListItemText primary="Coaches" />
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

            <RoleSwitchPrompt />

            {/* My Account */}
            <ListItemButton
                component={Link}
                to="/my-profile"
                selected={location.pathname === "/my-profile"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <ProfileIcon fontSize="small" />
                </ListItemAvatar>
                <ListItemText primary="My Account" />
            </ListItemButton>
        </div>
    );
};

export default AdminMenu;
