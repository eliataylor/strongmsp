import { Email } from "@mui/icons-material";
import {
    Box,
    Typography
} from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import { MenuButton } from "src/theme/StyledFields";
import Logo from "../theme/Logo";
import RoleBasedMenu from "./RoleBasedMenu";
import PublicPagesMenu from "./menus/PublicPagesMenu";

const Footer: React.FC = () => {

    const handleContactClick = () => {
        window.location.href = 'mailto:info@strongmindstrongperformance.com';
    };

    return (
        <>
            <Box
                color="transparent"
                sx={{
                    borderTop: 1,
                    px: 2,
                    py: 1,
                    display: 'flex',
                    justifyContent: { xs: 'center', md: 'space-between' },
                    alignItems: 'center',
                    borderColor: 'divider',
                    flexWrap: 'wrap',
                    color: 'white',
                    background: `black`
                }}
            >
                {/* Logo */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: { xs: 'center', md: 'flex-start' }
                }}>
                    <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        <Logo height={40} />
                        <Box sx={{
                            ml: 1,
                            fontWeight: 'bold',
                            color: 'text.primary',
                        }}>
                            <Typography
                                variant="h6"
                                component="div"
                                sx={{ m: 0, p: 0 }}
                            >
                                Strong Mind
                            </Typography>
                            <Typography
                                variant="h6"
                                component="div"
                                sx={{ m: 0, p: 0 }}
                            >
                                Strong Performance
                            </Typography>
                        </Box>
                    </Link>
                </Box>

                {/* Desktop Navigation */}
                <Box sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 2,
                    justifyContent: { xs: 'center', md: 'flex-end' }
                }}>
                    <PublicPagesMenu layout="footer" />
                    <RoleBasedMenu layout="footer" />

                    <MenuButton variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<Email fontSize="small" />}
                        onClick={handleContactClick}>
                        Contact Us
                    </MenuButton>
                </Box>
            </Box>
        </>
    );
};

export default Footer;
