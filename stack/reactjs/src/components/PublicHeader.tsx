import { Close as CloseIcon, Menu as MenuIcon } from "@mui/icons-material";
import {
    AppBar,
    Box,
    Divider,
    Drawer,
    IconButton,
    Toolbar,
    Typography,
    useMediaQuery,
    useTheme
} from "@mui/material";
import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FadedPaper } from "src/theme/StyledFields";
import { useUser } from "../allauth/auth/hooks";
import { useAppContext } from "../context/AppContext";
import Logo from "../theme/Logo";
import { ThemeContext } from "../theme/ThemeContext";
import RoleBasedMenu from "./RoleBasedMenu";
import PublicPagesMenu from "./menus/PublicPagesMenu";

const PublicHeader: React.FC = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const user = useUser();
    const { organization } = useAppContext();
    const { brandingSettings, updateOrganizationName, updateOrganizationShortName, updateLogoUrl } = useContext(ThemeContext);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    // Sync organization data with branding settings
    useEffect(() => {
        if (organization) {
            if (organization.name && !brandingSettings.organizationName) {
                updateOrganizationName(organization.name);
            }
            if (organization.short_name && !brandingSettings.organizationShortName) {
                updateOrganizationShortName(organization.short_name);
            }
            if (organization.logo && !brandingSettings.logoUrl) {
                updateLogoUrl(organization.logo);
            }
        }
    }, [organization, brandingSettings, updateOrganizationName, updateOrganizationShortName, updateLogoUrl]);


    const drawer = (
        <Box sx={{ zIndex: 250, minWidth: '150px' }}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1
            }}>
                <Logo height={30} />
                <IconButton onClick={handleDrawerToggle}>
                    <CloseIcon />
                </IconButton>
            </Box>

            <Box sx={{
                p: 1
            }}>
                <RoleBasedMenu layout="drawer" />
                <Divider sx={{ my: 1 }} />
                <PublicPagesMenu layout="drawer" />
            </Box>
        </Box>
    );

    return (
        <>
            <AppBar
                position="static"
                elevation={0}
                color="transparent"
                sx={(theme) => ({
                    borderBottom: 1,
                    borderColor: 'divider'
                })}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    {/* Logo */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                            <Logo height={40} />
                            <Box sx={{
                                ml: 1,
                                fontWeight: 'bold',
                                lineHeight: "16px",
                                color: 'text.primary',
                            }}>
                                <Typography
                                    variant="h6"
                                    component="div"
                                    sx={{ m: 0, p: 0, lineHeight: "16px" }}
                                >
                                    {brandingSettings?.organizationShortName ||
                                        brandingSettings?.organizationName ||
                                        "Strong Mind Strong Performance"}
                                </Typography>
                            </Box>
                        </Link>
                    </Box>

                    {/* Desktop Navigation */}
                    {!isMobile && (
                        <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'flex-end', gap: 2, mr: 3 }}>
                            {user?.id ? <RoleBasedMenu layout="header" /> : <PublicPagesMenu layout="header" />}
                        </Box>
                    )}

                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                    >
                        <MenuIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>


            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                anchor="right"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                color="transparent"
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile.
                }}
            >
                {drawer}
                <FadedPaper style={{ position: 'absolute', top: 0, left: 0, minHeight: '100vh', maxHeight: '100vh', width: '100%', padding: 0, margin: 0, zIndex: 0 }} />
            </Drawer>


        </>
    );
};

export default PublicHeader;
