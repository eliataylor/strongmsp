import { Avatar, Box, Card, CardContent, CardHeader, Chip, Grid, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import ProfileForm from "../components/ProfileForm";
import ApiClient from "../config/ApiClient";

export default function ProfilePage() {
    const theme = useTheme();
    const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));

    type ProfileData = {
        first_name: string;
        last_name: string;
        gender?: string | null;
        ethnicity?: string[] | null;
        birthdate?: string | null;
        zip_code?: string | null;
        bio?: string | null;
        avatar?: string | null;
        photo?: string | null;
    };

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const initials = useMemo(() => {
        const first = profile?.first_name?.[0] || '';
        const last = profile?.last_name?.[0] || '';
        return (first + last).toUpperCase();
    }, [profile?.first_name, profile?.last_name]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const resp = await ApiClient.get<ProfileData>("/api/account/profile");
            if (mounted && resp.success && resp.data) {
                setProfile(resp.data);
            }
        })();
        return () => { mounted = false; };
    }, []);

    return (
        <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 1, sm: 2, md: 3 } }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>My Profile</Typography>
                    <Typography variant="body2" color="text.secondary">Manage your personal information, preferences, and profile images.</Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card elevation={isSmDown ? 0 : 1}>
                        <CardHeader title="Profile Overview" />
                        <CardContent>
                            <Stack spacing={2} alignItems="center">
                                <Avatar src={profile?.avatar || undefined} sx={{ width: 96, height: 96 }}>
                                    {initials}
                                </Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {(profile?.first_name || '') + (profile?.last_name ? ` ${profile.last_name}` : '')}
                                </Typography>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="center">
                                    <Chip label="Member" color="primary" variant="outlined" />
                                    {profile?.gender ? <Chip label={String(profile.gender)} size="small" /> : null}
                                    {profile?.zip_code ? <Chip label={`ZIP ${profile.zip_code}`} size="small" /> : null}
                                </Stack>
                                {profile?.bio ? (
                                    <Typography variant="body2" color="text.secondary" align="center">
                                        {profile.bio}
                                    </Typography>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" align="center">
                                        Keep your profile up to date to help coaches and teammates recognize you.
                                    </Typography>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card elevation={isSmDown ? 0 : 1}>
                        <CardHeader title="Edit Profile" />
                        <CardContent>
                            <ProfileForm />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}


