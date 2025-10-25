import { SvgIcon, SvgIconProps } from "@mui/material";
import React from "react";
import { ReactComponent as AthletesIcon } from "./athletes.svg";

const AthletesIconWrapper: React.FC<SvgIconProps> = (props) => {
    return (
        <SvgIcon {...props}>
            <AthletesIcon />
        </SvgIcon>
    );
};

export default AthletesIconWrapper;
