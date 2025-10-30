import { Divider } from "@mui/material";
import React from "react";
import { useAuth } from "src/allauth/auth";
import { useActiveRole } from "../context/ActiveRoleContext";
import AnonymousMenu from "./menus/AnonymousMenu";
import AthleteMenu from "./menus/AthleteMenu";
import CoachMenu from "./menus/CoachMenu";
import ParentMenu from "./menus/ParentMenu";
import { MenuProps } from "./menus/PublicPagesMenu";

const RoleBasedMenu: React.FC<MenuProps> = ({ layout = 'drawer' }) => {
    const { activeRole, hasRole } = useActiveRole();
    const auth = useAuth();

    // Get user from auth context for consistent state
    const user = auth?.data?.user;
    const isAuthenticated = auth?.meta?.is_authenticated;

    // Debug logging for menu state
    console.log("[MENU] RoleBasedMenu render - isAuthenticated:", isAuthenticated, "user:", user?.id, "activeRole:", activeRole);

    // If not authenticated, show anonymous menu
    if (!isAuthenticated) {
        console.log("[MENU] Showing AnonymousMenu - unauthenticated");
        return <AnonymousMenu layout={layout} />;
    }

    // When authenticated but user/role not yet resolved, avoid flashing AnonymousMenu
    if (!user?.id || !activeRole) {
        console.log("[MENU] Authenticated but awaiting user/role — rendering nothing to prevent flash");
        return null;
    }

    // Conditionally render the appropriate menu component based on activeRole
    const renderMenu = () => {
        switch (activeRole) {
            case 'parent':
                return hasRole('parent') ? <ParentMenu layout={layout} /> : null;
            case 'athlete':
                return hasRole('athlete') ? <AthleteMenu layout={layout} /> : null;
            case 'coach':
                return hasRole('coach') ? <CoachMenu layout={layout} /> : null;
            case 'admin':
                return hasRole('admin') ? <CoachMenu layout={layout} /> : null;
            case 'agent':
                return hasRole('agent') ? <CoachMenu layout={layout} /> : null;
            default:
                return <AnonymousMenu layout={layout} />;
        }
    };

    // Add divider for drawer layout to separate from public pages
    if (layout === 'drawer') {
        return (
            <>
                <Divider sx={{ my: 1 }} />
                {renderMenu()}
            </>
        );
    }

    return renderMenu();
};

export default RoleBasedMenu;
