import { Divider } from "@mui/material";
import React from "react";
import { useUser } from "src/allauth/auth";
import { useActiveRole } from "../context/ActiveRoleContext";
import AnonymousMenu from "./menus/AnonymousMenu";
import AthleteMenu from "./menus/AthleteMenu";
import CoachMenu from "./menus/CoachMenu";
import ParentMenu from "./menus/ParentMenu";
import { MenuProps } from "./menus/PublicPagesMenu";

const RoleBasedMenu: React.FC<MenuProps> = ({ layout = 'drawer' }) => {
    const { activeRole, hasRole } = useActiveRole();
    const user = useUser();


    // Return AnonymousMenu if no active role is set
    if (!activeRole || !user?.id) {
        return <AnonymousMenu layout={layout} />;
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
