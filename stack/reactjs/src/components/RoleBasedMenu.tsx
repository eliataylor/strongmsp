import React from "react";
import { useActiveRole } from "../context/ActiveRoleContext";
import AdminMenu from "./menus/AdminMenu";
import AthleteMenu from "./menus/AthleteMenu";
import CoachMenu from "./menus/CoachMenu";
import ParentMenu from "./menus/ParentMenu";

const RoleBasedMenu: React.FC = () => {
    const { activeRole, hasRole } = useActiveRole();

    // Return null if no active role is set
    if (!activeRole) {
        return null;
    }

    // Conditionally render the appropriate menu component based on activeRole
    switch (activeRole) {
        case 'parent':
            return hasRole('parent') ? <ParentMenu /> : null;
        case 'athlete':
            return hasRole('athlete') ? <AthleteMenu /> : null;
        case 'coach':
            return hasRole('coach') ? <CoachMenu /> : null;
        case 'admin':
            return hasRole('admin') ? <AdminMenu /> : null;
        default:
            return null;
    }
};

export default RoleBasedMenu;
