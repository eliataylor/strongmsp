import { AppRegistration, Login } from "@mui/icons-material";
import { Box } from "@mui/material";
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MenuButton } from "src/theme/StyledFields";
import LoginModal from "../LoginModal";
import SignupModal from "../SignupModal";
import { MenuProps } from "./PublicPagesMenu";

const AnonymousMenu: React.FC<MenuProps> = ({ layout = 'drawer' }) => {
    const location = useLocation();
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [signupModalOpen, setSignupModalOpen] = useState(false);

    const handleLoginClick = () => {
        setLoginModalOpen(true);
    };

    const handleSignupClick = () => {
        setSignupModalOpen(true);
    };

    const menuItems = [
        { path: "/account/login", icon: Login, label: "Sign In", action: handleLoginClick },
        { path: "/account/signup", icon: AppRegistration, label: "Sign Up", action: handleSignupClick }
    ];

    const renderItems = () => {
        return menuItems.map(({ path, icon: Icon, label, action }) => (
            <MenuButton
                key={path}
                component={Link}
                to={path}
                fullWidth={layout === 'drawer'}
                startIcon={<Icon fontSize="small" color="secondary" />}
                color={location.pathname === path ? "primary" : "inherit"}
                onClick={action}
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
        gap: 1,
        flexDirection: layout === 'drawer' ? 'column' : 'row'
    }

    return (
        <>
            <Box sx={wrapperStyles}>{renderItems()}</Box>
            <LoginModal
                open={loginModalOpen}
                onClose={() => setLoginModalOpen(false)}
            />
            <SignupModal
                open={signupModalOpen}
                onClose={() => setSignupModalOpen(false)}
            />
        </>
    );
};

export default AnonymousMenu;