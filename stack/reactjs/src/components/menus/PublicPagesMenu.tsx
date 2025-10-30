import {
    Foundation,
    Notifications as NotificationsIcon,
    Person as PersonIcon
} from "@mui/icons-material";
import {
    Box
} from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { MenuButton } from "src/theme/StyledFields";

export type MenuLayout = 'drawer' | 'footer' | 'header';

export interface MenuProps {
    layout?: MenuLayout;
}

const PublicPagesMenu: React.FC<MenuProps> = ({ layout = 'drawer' }) => {
    const location = useLocation();

    const menuItems = [
        { path: "/", icon: Foundation, label: "Home" },
        { path: "/about", icon: NotificationsIcon, label: "About" },
        { path: "/faqs", icon: PersonIcon, label: "FAQs" }
    ];

    const renderItems = () => {
        return menuItems.map(({ path, icon: Icon, label }) => (
            <MenuButton
                key={path}
                component={Link}
                to={path}
                variant="text"
                fullWidth={layout === 'drawer'}
                startIcon={<Icon fontSize="small" />}
                sx={{
                    justifyContent: layout === 'drawer' ? 'flex-start' : 'center',
                }}
                color={location.pathname === path ? "primary" : "inherit"}
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

export default PublicPagesMenu;
