import { Box, useTheme } from '@mui/material';
import React from 'react';

interface LogoRadialGradientProps {
    width?: string | number;
    height?: string | number;
    opacity?: number;
    radius?: string;
}

const LogoRadialGradient: React.FC<LogoRadialGradientProps> = ({
    width = '100%',
    height = '100%',
    opacity = 0.15,
    radius = '50%'
}) => {
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';

    // Get background colors from theme
    const backgroundColor = theme.palette.background.default;

    // Convert hex to RGB for rgba usage
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    const rgb = hexToRgb(backgroundColor);
    if (!rgb) return null;

    const gradientColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;

    return (
        <Box
            id="logo-radial-gradient"
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width,
                height,
                pointerEvents: 'none',
                zIndex: 1,
                background: `
                    radial-gradient(circle at 20% 50%, ${theme.palette.primary.main}10 0%, transparent ${radius}),
                    radial-gradient(circle at 80% 20%, ${theme.palette.secondary.main}10 0%, transparent ${radius}),
                    radial-gradient(circle at 40% 80%, ${theme.palette.primary.main}05 0%, transparent 50%)
                `,
            }}
        />
    );
};

export default LogoRadialGradient;
