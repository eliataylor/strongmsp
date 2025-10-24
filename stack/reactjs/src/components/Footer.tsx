import { Email } from "@mui/icons-material";
import {
    Box,
    Typography
} from "@mui/material";
import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { MenuButton } from "src/theme/StyledFields";
import { useAppContext } from "../context/AppContext";
import Logo from "../theme/Logo";
import { ThemeContext } from "../theme/ThemeContext";
import RoleBasedMenu from "./RoleBasedMenu";
import PublicPagesMenu from "./menus/PublicPagesMenu";

const Footer: React.FC = () => {
    const { organization } = useAppContext();
    const { brandingSettings } = useContext(ThemeContext);

    const handleContactClick = () => {
        window.location.href = 'mailto:info@strongmindstrongperformance.com';
    };

    // Check if this is SMSP organization
    const isSMSP = organization?.slug === 'strongmindstrongperformance' ||
        organization?.name?.toLowerCase().includes('strong mind strong performance') ||
        (!organization && !brandingSettings?.organizationName);

    // Get organization display name
    const orgDisplayName = brandingSettings?.organizationShortName ||
        brandingSettings?.organizationName ||
        organization?.short_name ||
        organization?.name;

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
                            {isSMSP ? (
                                // Show only SMSP for SMSP organization
                                <>
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
                                </>
                            ) : (
                                // Show organization name with "powered by SMSP" for other organizations
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Typography
                                        variant="h6"
                                        component="div"
                                        sx={{ m: 0, p: 0, lineHeight: 1.2 }}
                                    >
                                        {orgDisplayName}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                        <Typography
                                            variant="caption"
                                            component="span"
                                            sx={{
                                                m: 0,
                                                p: 0,
                                                fontSize: '0.7rem',
                                                opacity: 0.8,
                                                mr: 0.5
                                            }}
                                        >
                                            powered by
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            component="span"
                                            sx={{
                                                m: 0,
                                                p: 0,
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            Strong Mind Strong Performance
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
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
