import {
    AccountCircle as AccountCircleIcon,
    Dashboard as DashboardIcon
} from "@mui/icons-material";
import { Box } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { MenuButton } from "src/theme/StyledFields";
import { MenuProps } from "./PublicPagesMenu";

const ParentMenu: React.FC<MenuProps> = ({ layout = 'drawer' }) => {
    const location = useLocation();

    const menuItems = [
        { path: "/dashboard", icon: DashboardIcon, label: "Dashboard", priority: true },
        // { path: "/notifications", icon: NotificationsIcon, label: "Notifications", priority: true },
        //        { path: "/users", icon: PersonIcon, label: "Users", priority: false },
        //        { path: "/payments", icon: PaymentIcon, label: "Payments", priority: false },
        //        { path: "/coach-content", icon: SportsIcon, label: "Coach Content", priority: false },
        { path: "/my-profile", icon: AccountCircleIcon, label: "My Account", priority: false }
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
        flexDirection: layout === 'drawer' ? 'column' : 'row'
    }

    return <Box sx={wrapperStyles}>{renderItems()}</Box>;
};

export default ParentMenu;