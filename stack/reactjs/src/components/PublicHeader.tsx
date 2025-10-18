import { Close as CloseIcon, Menu as MenuIcon } from "@mui/icons-material";
import {
    AppBar,
    Box,
    Button,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Toolbar,
    Typography,
    useMediaQuery,
    useTheme
} from "@mui/material";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../allauth/auth";
import Logo from "../theme/Logo";
import LoginModal from "./LoginModal";
import SignupModal from "./SignupModal";

const PublicHeader: React.FC = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [signupModalOpen, setSignupModalOpen] = useState(false);
    const auth = useAuth();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLoginClick = () => {
        setLoginModalOpen(true);
    };

    const handleSignupClick = () => {
        setSignupModalOpen(true);
    };

    const handleContactClick = () => {
        window.location.href = 'mailto:info@strongmindstrongperformance.com';
    };

    const navigationItems = [
        { label: 'Home', path: '/' },
        { label: 'About', path: '/about' },
        { label: 'FAQs', path: '/faqs' },
    ];

    const isLoggedIn = auth?.data?.user;

    const drawer = (
        <Box sx={{ width: 250 }}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2
            }}>
                <Logo height={30} />
                <IconButton onClick={handleDrawerToggle}>
                    <CloseIcon />
                </IconButton>
            </Box>
            <List>
                {navigationItems.map((item) => (
                    <ListItem key={item.label} disablePadding>
                        <ListItemButton component={Link} to={item.path} onClick={handleDrawerToggle}>
                            <ListItemText primary={item.label} />
                        </ListItemButton>
                    </ListItem>
                ))}
                <ListItem disablePadding>
                    <ListItemButton onClick={handleContactClick}>
                        <ListItemText primary="Contact" />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <Box sx={{ p: 2, display: 'flex', gap: 1, flexDirection: 'column' }}>
                        {isLoggedIn ? (
                            <Button
                                component={Link}
                                to="/dashboard"
                                variant="contained"
                                fullWidth
                                sx={{ mb: 1 }}
                            >
                                Go to Dashboard
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={handleLoginClick}
                                    sx={{ mb: 1 }}
                                >
                                    Sign In
                                </Button>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={handleSignupClick}
                                >
                                    Sign Up
                                </Button>
                            </>
                        )}
                    </Box>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <>
            <AppBar
                position="static"
                color="default"
                elevation={0}
                sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    backgroundColor: 'background.paper'
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    {/* Logo */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                            <Logo height={40} />
                            <Typography
                                variant="h6"
                                component="div"
                                sx={{
                                    ml: 1,
                                    fontWeight: 'bold',
                                    color: 'text.primary',
                                    display: { xs: 'none', sm: 'block' }
                                }}
                            >
                                Strong Mind Strong Performance
                            </Typography>
                        </Link>
                    </Box>

                    {/* Desktop Navigation */}
                    {!isMobile && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {navigationItems.map((item) => (
                                <Button
                                    key={item.label}
                                    component={Link}
                                    to={item.path}
                                    color="inherit"
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 500,
                                        color: 'text.primary'
                                    }}
                                >
                                    {item.label}
                                </Button>
                            ))}
                            <Button
                                onClick={handleContactClick}
                                color="inherit"
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    color: 'text.primary'
                                }}
                            >
                                Contact
                            </Button>
                            {isLoggedIn ? (
                                <Button
                                    component={Link}
                                    to="/dashboard"
                                    variant="contained"
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 500
                                    }}
                                >
                                    Dashboard
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="outlined"
                                        onClick={handleLoginClick}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 500
                                        }}
                                    >
                                        Sign In
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={handleSignupClick}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 500
                                        }}
                                    >
                                        Sign Up
                                    </Button>
                                </>
                            )}
                        </Box>
                    )}

                    {/* Mobile Menu Button */}
                    {isMobile && (
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}
                </Toolbar>
            </AppBar>

            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                anchor="right"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile.
                }}
                sx={{
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
                }}
            >
                {drawer}
            </Drawer>

            {/* Modals */}
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

export default PublicHeader;
