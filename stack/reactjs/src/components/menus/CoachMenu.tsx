import {
    Dashboard as DashboardIcon
} from "@mui/icons-material";
import { Box } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useUser } from "src/allauth/auth";
import { MenuButton } from "src/theme/StyledFields";
import ProfileIcon from "src/theme/icons/ProfileIcon";
import { MenuProps } from "./PublicPagesMenu";

const CoachMenu: React.FC<MenuProps> = ({ layout = 'drawer' }) => {
    const location = useLocation();
    const user = useUser();
    const menuItems = [
        { path: "/dashboard", icon: DashboardIcon, label: "Dashboard", priority: true },
        // { path: "/notifications", icon: NotificationsIcon, label: "Notifications", priority: true },
        //        { path: "/agent-responses", icon: SmartToyIcon, label: "Agent Responses", priority: false },
        //        { path: "/coach-content", icon: SportsIcon, label: "Coach Content", priority: false },
        { path: "/my-profile", icon: ProfileIcon, label: (user.display && layout === 'header') ? `${user.display}` : "My Account", priority: false },
        ...(layout !== 'header' ? [{ path: "/my-profile/settings", icon: ProfileIcon, label: "Settings", priority: false }] : [])
    ];

    const renderItems = () => {
        return menuItems.map(({ path, icon: Icon, label }) => (
            <MenuButton
                key={path}
                component={Link}
                to={path}
                startIcon={<Icon fontSize="small" />}
                color={location.pathname === path ? "primary" : "inherit"}
                sx={{
                    justifyContent: layout === 'drawer' ? 'flex-start' : 'center',
                }}
            >
                {label}
            </MenuButton>
        ));
    };

    const wrapperStyles = {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        justifyContent: 'space-between',
        flexDirection: layout === 'drawer' ? 'column' : 'row'
    }

    return <Box sx={wrapperStyles}>{renderItems()}</Box>;
};

export default CoachMenu;