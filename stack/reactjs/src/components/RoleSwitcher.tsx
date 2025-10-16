import { ExpandMore } from "@mui/icons-material";
import {
    Box,
    Chip,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Typography
} from "@mui/material";
import React, { useState } from "react";
import { useActiveRole } from "../context/ActiveRoleContext";
import { USER_TYPE } from "../object-actions/types/types";
import { getRoleConfig } from "../utils/roleUtils";

export default function RoleSwitcher() {
    const { activeRole, availableRoles, setActiveRole } = useActiveRole();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleRoleSelect = (role: USER_TYPE) => {
        console.log("[USERTYPE] RoleSwitcher - role selected:", role);
        setActiveRole(role);
        handleClose();
    };

    // Don't render if no active role or no available roles
    if (!activeRole || availableRoles.length <= 1) {
        console.log("[USERTYPE] RoleSwitcher - not rendering, activeRole:", activeRole, "availableRoles.length:", availableRoles.length);
        return null;
    }

    console.log("[USERTYPE] RoleSwitcher - rendering with activeRole:", activeRole, "availableRoles:", availableRoles);

    const currentConfig = getRoleConfig(activeRole);

    return (
        <Box sx={{ px: 1, py: 0.5 }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    borderRadius: 1,
                    px: 1,
                    py: 0.5,
                    "&:hover": {
                        backgroundColor: "action.hover"
                    }
                }}
                onClick={handleClick}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {currentConfig.icon}
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {currentConfig.label}
                    </Typography>
                </Box>
                <IconButton size="small" sx={{ p: 0 }}>
                    <ExpandMore fontSize="small" />
                </IconButton>
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left"
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "left"
                }}
            >
                {availableRoles.map((role) => {
                    const config = getRoleConfig(role);
                    const isActive = role === activeRole;

                    return (
                        <MenuItem
                            key={role}
                            onClick={() => handleRoleSelect(role)}
                            selected={isActive}
                            sx={{
                                minWidth: 150,
                                "&.Mui-selected": {
                                    backgroundColor: "action.selected"
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                                {config.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={config.label}
                                primaryTypographyProps={{
                                    fontWeight: isActive ? 600 : 400
                                }}
                            />
                            {isActive && (
                                <Chip
                                    size="small"
                                    label="Active"
                                    color={config.color}
                                    sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                                />
                            )}
                        </MenuItem>
                    );
                })}
            </Menu>
        </Box>
    );
}
