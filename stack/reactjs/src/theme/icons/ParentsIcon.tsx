import { SvgIcon, SvgIconProps } from "@mui/material";
import React from "react";
import { ReactComponent as ParentsIcon } from "./parents.svg";

const ParentsIconWrapper: React.FC<SvgIconProps> = (props) => {
    return (
        <SvgIcon {...props}>
            <ParentsIcon />
        </SvgIcon>
    );
};

export default ParentsIconWrapper;
