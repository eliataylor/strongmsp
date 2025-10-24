import {
    Delete as DeleteIcon,
    Palette as PaletteIcon,
    TextFields as TypographyIcon,
    Upload as UploadIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Divider,
    Grid,
    IconButton,
    Snackbar,
    TextField,
    Typography
} from '@mui/material';
import React, { useContext, useState } from 'react';
import { useActiveRole } from '../context/ActiveRoleContext';
import { useAppContext } from '../context/AppContext';
import ImageUpload, { Upload } from '../object-actions/forming/ImageUpload';
import FontSelector from '../theme/FontSelector';
import Logo from '../theme/Logo';
import { ThemeContext } from '../theme/ThemeContext';
import ThemeSwitcher from '../theme/ThemeSwitcher';

const BrandingSettings: React.FC = () => {
    const { brandingSettings, updateBrandingSettings, resetBrandingSettings, updateLogo, updateOrganizationName, updateOrganizationShortName, updateLogoUrl } = useContext(ThemeContext);
    const { hasRole } = useActiveRole();
    const { organization } = useAppContext();
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    // Check if user has admin role
    if (!hasRole('admin')) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h6" color="error">
                    Access Denied
                </Typography>
                <Typography>
                    You need admin privileges to access branding settings.
                </Typography>
            </Box>
        );
    }

    const handleImageSelect = (selected: Upload, field_name: string, index: number) => {
        if (selected && selected.file) {
            setUploadedFile(selected.file as File);
            // Convert to base64 for storage
            const reader = new FileReader();
            reader.onload = () => {
                updateLogo(reader.result as string);
                setSnackbarMessage('Logo updated successfully!');
                setSnackbarOpen(true);
            };
            reader.onerror = () => {
                setSnackbarMessage('Error uploading logo');
                setSnackbarOpen(true);
            };
            reader.readAsDataURL(selected.file);
        }
    };

    const handleRemoveLogo = () => {
        setUploadedFile(null);
        updateLogo(null);
        setSnackbarMessage('Logo removed successfully!');
        setSnackbarOpen(true);
    };

    const handleColorChange = (path: string, value: string) => {
        const newSettings = { ...brandingSettings };
        const keys = path.split('.');
        let current: Record<string, any> = newSettings;

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;

        updateBrandingSettings(newSettings);
    };

    const handleOrganizationNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateOrganizationName(event.target.value);
    };

    const handleOrganizationShortNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateOrganizationShortName(event.target.value);
    };

    const handleLogoUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateLogoUrl(event.target.value);
    };


    const handleSave = () => {
        setSnackbarMessage('Settings saved successfully!');
        setSnackbarOpen(true);
    };

    const handleReset = () => {
        resetBrandingSettings();
        setSnackbarMessage('Settings reset to defaults!');
        setSnackbarOpen(true);
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                {organization?.name ? `${organization.name} - Branding Settings` : 'Branding Settings'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Customize your platform's appearance and branding.
            </Typography>

            <Grid container spacing={3}>
                {/* Logo Section */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader
                            title="Logo"
                            avatar={<UploadIcon />}
                            action={
                                (brandingSettings.customLogoBase64 || uploadedFile) && (
                                    <IconButton onClick={handleRemoveLogo} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                )
                            }
                        />
                        <CardContent>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Current Logo
                                </Typography>
                                <Box sx={{
                                    border: '1px dashed #ccc',
                                    p: 2,
                                    borderRadius: 1,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    minHeight: 100
                                }}>
                                    {uploadedFile ? (
                                        <img
                                            src={URL.createObjectURL(uploadedFile)}
                                            alt="Uploaded logo preview"
                                            style={{ maxHeight: 80, maxWidth: 200, objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <Logo height={80} />
                                    )}
                                </Box>
                            </Box>

                            <ImageUpload
                                mime_type="image"
                                onSelect={handleImageSelect}
                                field_name="logo"
                                index={0}
                                selected={brandingSettings.customLogoBase64}
                                buttonProps={{
                                    label: "Upload New Logo",
                                    fullWidth: true,
                                    variant: "outlined"
                                }}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Organization Name Section */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader
                            title="Organization Details"
                            avatar={<TypographyIcon />}
                        />
                        <CardContent>
                            <Box sx={{ mb: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Organization Name"
                                    value={brandingSettings.organizationName || organization?.name || ""}
                                    onChange={handleOrganizationNameChange}
                                    placeholder="Enter organization name"
                                    variant="outlined"
                                    size="small"
                                    helperText="Full organization name"
                                />
                            </Box>
                            <Box sx={{ mb: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Short Name"
                                    value={brandingSettings.organizationShortName || organization?.short_name || ""}
                                    onChange={handleOrganizationShortNameChange}
                                    placeholder="Enter short name (e.g., SMSP)"
                                    variant="outlined"
                                    size="small"
                                    helperText="Short name displayed in header"
                                />
                            </Box>
                            <Box>
                                <TextField
                                    fullWidth
                                    label="Logo URL"
                                    value={brandingSettings.logoUrl || organization?.logo || ""}
                                    onChange={handleLogoUrlChange}
                                    placeholder="Enter logo URL"
                                    variant="outlined"
                                    size="small"
                                    helperText="URL to organization logo image"
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Theme & Font Section */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader
                            title="Theme & Typography"
                            avatar={<TypographyIcon />}
                        />
                        <CardContent>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Theme Mode
                                </Typography>
                                <ThemeSwitcher />
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Font Family
                                </Typography>
                                <FontSelector />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Primary Colors Section */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader
                            title="Primary Colors"
                            avatar={<PaletteIcon />}
                        />
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Light Mode
                                    </Typography>
                                    <TextField
                                        type="color"
                                        value={brandingSettings.palette.light.primary.main}
                                        onChange={(e) => handleColorChange('palette.light.primary.main', e.target.value)}
                                        fullWidth
                                        size="small"
                                    />
                                    <Chip
                                        label={brandingSettings.palette.light.primary.main}
                                        size="small"
                                        sx={{ mt: 1, width: '100%' }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Dark Mode
                                    </Typography>
                                    <TextField
                                        type="color"
                                        value={brandingSettings.palette.dark.primary.main}
                                        onChange={(e) => handleColorChange('palette.dark.primary.main', e.target.value)}
                                        fullWidth
                                        size="small"
                                    />
                                    <Chip
                                        label={brandingSettings.palette.dark.primary.main}
                                        size="small"
                                        sx={{ mt: 1, width: '100%' }}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Secondary Colors Section */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader
                            title="Secondary Colors"
                            avatar={<PaletteIcon />}
                        />
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Light Mode
                                    </Typography>
                                    <TextField
                                        type="color"
                                        value={brandingSettings.palette.light.secondary.main}
                                        onChange={(e) => handleColorChange('palette.light.secondary.main', e.target.value)}
                                        fullWidth
                                        size="small"
                                    />
                                    <Chip
                                        label={brandingSettings.palette.light.secondary.main}
                                        size="small"
                                        sx={{ mt: 1, width: '100%' }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Dark Mode
                                    </Typography>
                                    <TextField
                                        type="color"
                                        value={brandingSettings.palette.dark.secondary.main}
                                        onChange={(e) => handleColorChange('palette.dark.secondary.main', e.target.value)}
                                        fullWidth
                                        size="small"
                                    />
                                    <Chip
                                        label={brandingSettings.palette.dark.secondary.main}
                                        size="small"
                                        sx={{ mt: 1, width: '100%' }}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Action Buttons */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Button
                                    variant="outlined"
                                    onClick={handleReset}
                                    color="warning"
                                >
                                    Reset to Defaults
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={handleSave}
                                    color="primary"
                                >
                                    Save Settings
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
            >
                <Alert onClose={() => setSnackbarOpen(false)} severity="success">
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default BrandingSettings;
