import { SvgIconProps } from "@mui/material";
import React from "react";
import { useActiveRole } from "../../context/ActiveRoleContext";
import AdminIconWrapper from "./AdminIcon";
import AthletesIconWrapper from "./AthletesIcon";
import CoachesIconWrapper from "./CoachesIcon";
import ParentsIconWrapper from "./ParentsIcon";

const ProfileIcon: React.FC<SvgIconProps> = (props) => {
    const { activeRole } = useActiveRole();

    switch (activeRole) {
        case 'coach':
            return <CoachesIconWrapper {...props} />;
        case 'athlete':
            return <AthletesIconWrapper {...props} />;
        case 'parent':
            return <ParentsIconWrapper {...props} />;
        case 'admin':
            return <AdminIconWrapper {...props} />;
        default:
            // Fallback to a generic account icon if no role is set
            return <CoachesIconWrapper {...props} />;
    }
};

export default ProfileIcon;
