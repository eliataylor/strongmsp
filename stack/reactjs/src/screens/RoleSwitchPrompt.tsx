import { ArrowBack } from "@mui/icons-material";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Stack,
    Typography
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useActiveRole } from "../context/ActiveRoleContext";
import { USER_TYPE } from "../object-actions/types/types";
import { getSwitchPromptRoleConfig } from "../utils/roleUtils";

export default function RoleSwitchPrompt() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { activeRole, availableRoles, setActiveRole } = useActiveRole();

    const requiredRole = searchParams.get("required") as USER_TYPE;
    const nextUrl = searchParams.get("next") || "/";

    // If no required role specified, redirect to home
    if (!requiredRole) {
        navigate("/");
        return null;
    }

    // If user doesn't have the required role, show access denied
    if (!availableRoles.includes(requiredRole)) {
        return (
            <Container maxWidth="sm" sx={{ py: 4 }}>
                <Card>
                    <CardContent sx={{ textAlign: "center", p: 4 }}>
                        <Alert severity="error" sx={{ mb: 3 }}>
                            Access Denied
                        </Alert>
                        <Typography variant="h6" gutterBottom>
                            You don't have access to this page
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            This page requires {getSwitchPromptRoleConfig(requiredRole).label} access, but you don't have this role assigned to your account.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => navigate("/")}
                            startIcon={<ArrowBack />}
                        >
                            Return Home
                        </Button>
                    </CardContent>
                </Card>
            </Container>
        );
    }

    // If user already has the required role active, redirect to the target page
    if (activeRole === requiredRole) {
        navigate(nextUrl);
        return null;
    }

    const handleSwitchRole = () => {
        setActiveRole(requiredRole);
        navigate(nextUrl);
    };

    const handleCancel = () => {
        navigate(-1); // Go back to previous page
    };

    const requiredConfig = getSwitchPromptRoleConfig(requiredRole);
    const currentConfig = activeRole ? getSwitchPromptRoleConfig(activeRole) : null;

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Card>
                <CardContent sx={{ textAlign: "center", p: 4 }}>
                    <Box sx={{ mb: 3 }}>
                        {requiredConfig.icon}
                    </Box>

                    <Typography variant="h5" gutterBottom>
                        Switch to {requiredConfig.label} View
                    </Typography>

                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        This page requires {requiredConfig.label} access.
                        {currentConfig && (
                            <> You're currently viewing as {currentConfig.label}.</>
                        )}
                    </Typography>

                    <Alert severity="info" sx={{ mb: 3, textAlign: "left" }}>
                        <Typography variant="body2">
                            <strong>What this means:</strong><br />
                            • You'll see content and features specific to {requiredConfig.label}s<br />
                            • You can switch back to your other roles anytime using the role switcher in the sidebar
                        </Typography>
                    </Alert>

                    <Stack direction="row" spacing={2} justifyContent="center">
                        <Button
                            variant="outlined"
                            onClick={handleCancel}
                            startIcon={<ArrowBack />}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSwitchRole}
                        >
                            Switch to {requiredConfig.label}
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        </Container>
    );
}
