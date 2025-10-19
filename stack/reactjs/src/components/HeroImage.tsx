import {
    Psychology,
    Sports,
    Star,
    TrendingUp
} from '@mui/icons-material';
import {
    Box,
    Chip,
    Container,
    Fade,
    Grid,
    Typography,
    useTheme
} from '@mui/material';
import React from 'react';
import Logo from '../theme/Logo';

interface HeroImageProps {
    showStats?: boolean;
}

const HeroImage: React.FC<HeroImageProps> = ({
    showStats = true
}) => {
    const theme = useTheme();

    const stats = [
        { icon: <Star />, label: "4.9/5 Rating", color: "primary" as const },
        { icon: <TrendingUp />, label: "1000+ Athletes", color: "success" as const },
        { icon: <Psychology />, label: "Evidence-Based", color: "info" as const }
    ];

    return (
        <Box
            sx={{
                py: "5%",
                minHeight: "calc(100vh - 200px)",
                position: 'relative',
                background: `linear-gradient(135deg, 
                    ${theme.palette.primary.light}15 0%, 
                    ${theme.palette.secondary.light}15 50%, 
                    ${theme.palette.background.default} 100%)`,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {/* Background Pattern */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `
                        radial-gradient(circle at 20% 50%, ${theme.palette.primary.main}10 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, ${theme.palette.secondary.main}10 0%, transparent 50%),
                        radial-gradient(circle at 40% 80%, ${theme.palette.primary.main}05 0%, transparent 50%)
                    `,
                    zIndex: 1
                }}
            />

            {/* Main Content */}
            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
                <Grid container spacing={4} alignItems="center">
                    {/* Left Side - Logo and Main Content */}
                    <Grid item xs={12} md={6}>
                        <Fade in={true} timeout={1000}>
                            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                                <Typography
                                    variant="h2"
                                    component="h1"
                                    sx={{
                                        fontSize: { xs: '2.5rem', md: '3.5rem' },
                                        fontWeight: 'bold',
                                        mb: 2,
                                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}
                                >
                                    Confidence Isn't a Trait. It's a System.
                                </Typography>

                                <Typography
                                    variant="h5"
                                    component="h2"
                                    sx={{
                                        color: 'text.secondary',
                                        mb: 3,
                                        lineHeight: 1.4
                                    }}
                                >
                                    A mental strengthening program for youth athletes aged 13–18.
                                    <br />
                                    Built for parents and coaches ready to support their athletes with tools that work.
                                </Typography>

                                {showStats && (
                                    <Box sx={{
                                        display: 'flex',
                                        gap: 2,
                                        flexWrap: 'wrap',
                                        justifyContent: { xs: 'center', md: 'flex-start' },
                                        mb: 3
                                    }}>
                                        {stats.map((stat, index) => (
                                            <Fade in={true} timeout={1000 + index * 200} key={index}>
                                                <Chip
                                                    icon={stat.icon}
                                                    label={stat.label}
                                                    color={stat.color}
                                                    variant="outlined"
                                                    sx={{
                                                        fontWeight: 'bold',
                                                        '& .MuiChip-icon': {
                                                            fontSize: '1.2rem'
                                                        }
                                                    }}
                                                />
                                            </Fade>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </Fade>
                    </Grid>

                    {/* Right Side - Logo and Visual Elements */}
                    <Grid item xs={12} md={6}>
                        <Fade in={true} timeout={1500}>
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                position: 'relative'
                            }}>
                                {/* Main Logo */}
                                <Box sx={{ mb: 4 }}>
                                    <Logo height={400} />
                                </Box>

                                {/* Floating Elements */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: '10%',
                                        right: '10%',
                                        animation: 'float 3s ease-in-out infinite',
                                        '@keyframes float': {
                                            '0%, 100%': { transform: 'translateY(0px)' },
                                            '50%': { transform: 'translateY(-10px)' }
                                        }
                                    }}
                                >
                                    <Sports
                                        sx={{
                                            fontSize: 60,
                                            color: theme.palette.primary.main,
                                            opacity: 0.7
                                        }}
                                    />
                                </Box>

                                <Box
                                    sx={{
                                        position: 'absolute',
                                        bottom: '20%',
                                        left: '5%',
                                        animation: 'float 3s ease-in-out infinite 1.5s',
                                        '@keyframes float': {
                                            '0%, 100%': { transform: 'translateY(0px)' },
                                            '50%': { transform: 'translateY(-10px)' }
                                        }
                                    }}
                                >
                                    <Psychology
                                        sx={{
                                            fontSize: 50,
                                            color: theme.palette.secondary.main,
                                            opacity: 0.7
                                        }}
                                    />
                                </Box>

                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: '60%',
                                        right: '5%',
                                        animation: 'float 3s ease-in-out infinite 0.5s',
                                        '@keyframes float': {
                                            '0%, 100%': { transform: 'translateY(0px)' },
                                            '50%': { transform: 'translateY(-10px)' }
                                        }
                                    }}
                                >
                                    <TrendingUp
                                        sx={{
                                            fontSize: 45,
                                            color: theme.palette.success.main,
                                            opacity: 0.7
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Fade>
                    </Grid>
                </Grid>
            </Container>

            {/* Bottom Wave Effect */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 100,
                    background: `linear-gradient(to top, ${theme.palette.background.default}, transparent)`,
                    zIndex: 1
                }}
            />
        </Box>
    );
};

export default HeroImage;
