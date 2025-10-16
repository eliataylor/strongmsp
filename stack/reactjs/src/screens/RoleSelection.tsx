import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    CircularProgress,
    Container,
    FormControlLabel,
    Grid,
    Typography
} from "@mui/material";
import { useState } from "react";
import { useAuth } from "../allauth/auth";
import { USER_TYPE } from "../object-actions/types/types";
import { getOnboardingRoleConfig } from "../utils/roleUtils";

export default function RoleSelection() {
    const auth = useAuth();
    const [selectedRoles, setSelectedRoles] = useState<USER_TYPE[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const user = auth?.data?.user;

    console.log("[USERTYPE] RoleSelection - user:", user);
    console.log("[USERTYPE] RoleSelection - user groups:", user?.groups);

    // If user already has groups, redirect to home
    if (user?.groups && user.groups.length > 0) {
        console.log("[USERTYPE] RoleSelection - user already has groups, redirecting to home");
        window.location.href = "/";
        return null;
    }

    // If user is staff, they automatically get admin role
    const availableRoles: USER_TYPE[] = user?.is_staff ? ['admin'] : ['athlete', 'parent'];

    const handleRoleToggle = (role: USER_TYPE) => {
        setSelectedRoles(prev => {
            if (prev.includes(role)) {
                return prev.filter(r => r !== role);
            } else {
                return [...prev, role];
            }
        });
    };

    const handleSubmit = async () => {
        console.log("[USERTYPE] RoleSelection - handleSubmit called with selectedRoles:", selectedRoles);

        if (selectedRoles.length === 0) {
            console.log("[USERTYPE] RoleSelection - no roles selected, showing error");
            setError("Please select at least one role");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Groups directly match USER_TYPE values, no mapping needed
            const groupNames = selectedRoles;
            console.log("[USERTYPE] RoleSelection - sending groups to API:", groupNames);

            // Make API call to update user groups
            const response = await fetch('/api/users/me/groups/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': (document.querySelector('[name=csrfmiddlewaretoken]') as HTMLInputElement)?.value || '',
                },
                body: JSON.stringify({
                    groups: groupNames
                })
            });

            console.log("[USERTYPE] RoleSelection - API response status:", response.status);

            if (!response.ok) {
                throw new Error('Failed to update user groups');
            }

            console.log("[USERTYPE] RoleSelection - groups updated successfully, reloading page");
            // Refresh auth context to get updated user data
            window.location.reload();
        } catch (err) {
            console.log("[USERTYPE] RoleSelection - error updating groups:", err);
            setError("Failed to save role selection. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ textAlign: "center", mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Choose Your Role
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Select the role(s) that best describe how you'll use the platform
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {availableRoles.map((role) => {
                    const config = getOnboardingRoleConfig(role);
                    const isSelected = selectedRoles.includes(role);

                    return (
                        <Grid item xs={12} sm={6} key={role}>
                            <Card
                                sx={{
                                    height: "100%",
                                    cursor: "pointer",
                                    border: isSelected ? 2 : 1,
                                    borderColor: isSelected ? "primary.main" : "divider",
                                    "&:hover": {
                                        boxShadow: 3
                                    }
                                }}
                                onClick={() => handleRoleToggle(role)}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Box sx={{ textAlign: "center", mb: 2 }}>
                                        {config.icon}
                                    </Box>

                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={() => handleRoleToggle(role)}
                                                    color="primary"
                                                />
                                            }
                                            label={
                                                <Typography variant="h6" component="h2">
                                                    {config.label}
                                                </Typography>
                                            }
                                            sx={{ m: 0 }}
                                        />
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: "center" }}>
                                        {config.description}
                                    </Typography>

                                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                                        {config.features.map((feature: string, index: number) => (
                                            <Typography
                                                key={index}
                                                component="li"
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 0.5 }}
                                            >
                                                {feature}
                                            </Typography>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            <Box sx={{ textAlign: "center", mt: 4 }}>
                <Button
                    variant="contained"
                    size="large"
                    onClick={handleSubmit}
                    disabled={selectedRoles.length === 0 || isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                >
                    {isSubmitting ? "Saving..." : "Continue"}
                </Button>
            </Box>
        </Container>
    );
}
