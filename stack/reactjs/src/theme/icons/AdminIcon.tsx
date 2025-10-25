import { SvgIcon, SvgIconProps } from "@mui/material";
import React from "react";
import { ReactComponent as AdminIcon } from "./admin.svg";

const AdminIconWrapper: React.FC<SvgIconProps> = (props) => {
    return (
        <SvgIcon {...props}>
            <AdminIcon />
        </SvgIcon>
    );
};

export default AdminIconWrapper;
