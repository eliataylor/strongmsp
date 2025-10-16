import {
    AdminPanelSettings,
    Diversity3,
    Sports,
    SportsEsports
} from "@mui/icons-material";
import { ROLE_CONFIG, USER_TYPE } from "../object-actions/types/types";

// Helper function to get role config with MUI icons
export const getRoleConfig = (role: USER_TYPE) => {
    const config = ROLE_CONFIG[role];
    const iconMap = {
        Sports: <Sports fontSize="small" />,
        Diversity3: <Diversity3 fontSize="small" />,
        SportsEsports: <SportsEsports fontSize="small" />,
        AdminPanelSettings: <AdminPanelSettings fontSize="small" />
    };

    return {
        ...config,
        icon: iconMap[config.icon as keyof typeof iconMap]
    };
};

// Helper function to get role config for onboarding (with larger icons)
export const getOnboardingRoleConfig = (role: USER_TYPE) => {
    const config = ROLE_CONFIG[role];
    const iconMap = {
        Sports: <Sports sx={{ fontSize: 48, color: "primary.main" }} />,
        Diversity3: <Diversity3 sx={{ fontSize: 48, color: "secondary.main" }} />,
        SportsEsports: <SportsEsports sx={{ fontSize: 48, color: "success.main" }} />,
        AdminPanelSettings: <AdminPanelSettings sx={{ fontSize: 48, color: "error.main" }} />
    };

    return {
        ...config,
        icon: iconMap[config.icon as keyof typeof iconMap]
    };
};

// Helper function to get role config for switch prompt (with medium icons)
export const getSwitchPromptRoleConfig = (role: USER_TYPE) => {
    const config = ROLE_CONFIG[role];
    const iconMap = {
        Sports: <Sports sx={{ fontSize: 40, color: "primary.main" }} />,
        Diversity3: <Diversity3 sx={{ fontSize: 40, color: "secondary.main" }} />,
        SportsEsports: <SportsEsports sx={{ fontSize: 40, color: "success.main" }} />,
        AdminPanelSettings: <AdminPanelSettings sx={{ fontSize: 40, color: "error.main" }} />
    };

    return {
        ...config,
        icon: iconMap[config.icon as keyof typeof iconMap]
    };
};
