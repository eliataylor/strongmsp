import { SvgIcon, SvgIconProps } from "@mui/material";
import React from "react";
import { ReactComponent as CoachesIcon } from "./coaches.svg";

const CoachesIconWrapper: React.FC<SvgIconProps> = (props) => {
    return (
        <SvgIcon {...props}>
            <CoachesIcon />
        </SvgIcon>
    );
};

export default CoachesIconWrapper;
