import { AlternateEmail, DevicesOther, ExpandMore, Logout, Password, SwitchAccount, VpnKey } from "@mui/icons-material";
import { Box, Card, CardContent, Chip, Grid, List, ListItemAvatar, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Typography } from "@mui/material";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, useConfig } from "../allauth/auth";
import { useActiveRole } from "../context/ActiveRoleContext";
import { USER_TYPE } from "../object-actions/types/types";
import ProfileIcon from "../theme/icons/ProfileIcon";
import ThemeSwitcher from "../theme/ThemeSwitcher";
import { getRoleConfig } from "../utils/roleUtils";

interface PermissionProps {
    to: string;
    icon?: string | React.ReactNode;
    name?: string;
}

const NavBarItem: React.FC<PermissionProps> = (props) => {
    return props.to.indexOf("http://") === 0 ||
        props.to.indexOf("https://") === 0 ? (
        <ListItemButton dense={true} alignItems={"center"}>
            {props.icon && (
                <ListItemAvatar sx={{ minWidth: 40 }}>{props.icon}</ListItemAvatar>
            )}
            <a
                target={"_blank"}
                style={{ textDecoration: "none", fontSize: 12 }}
                href={props.to}
            >
                {props.name}
            </a>
        </ListItemButton>
    ) : (
        <ListItemButton
            dense={true}
            component={Link}
            to={props.to}
            alignItems={"center"}
        >
            {props.icon && (
                <ListItemAvatar sx={{ minWidth: 40 }}>{props.icon}</ListItemAvatar>
            )}
            <ListItemText primary={props.name} />
        </ListItemButton>
    );
};

export default function MyAccount() {
    const me = useAuth()?.data?.user;
    const config = useConfig();
    const { activeRole, availableRoles, setActiveRole } = useActiveRole();
    const [roleMenuAnchor, setRoleMenuAnchor] = useState<null | HTMLElement>(null);
    const roleMenuOpen = Boolean(roleMenuAnchor);

    const handleRoleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setRoleMenuAnchor(event.currentTarget);
    };

    const handleRoleMenuClose = () => {
        setRoleMenuAnchor(null);
    };

    const handleRoleSelect = (role: USER_TYPE) => {
        console.log("[USERTYPE] MyAccount - role selected:", role);
        setActiveRole(role);
        handleRoleMenuClose();
    };

    if (!me || !me?.id) {
        return (
            <Box sx={{ mt: 3 }} alignItems="center" justifyContent="center">
                <Typography variant="h4" gutterBottom textAlign="center">
                    My Profile
                </Typography>
                <Typography textAlign="center">Please sign in to view your profile.</Typography>
            </Box>
        );
    }

    return (
        <Box p={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <Typography variant="h4">My Profile</Typography>
                {activeRole && (
                    <Chip
                        size="small"
                        label={getRoleConfig(activeRole).label}
                        color={getRoleConfig(activeRole).color}
                    />
                )}
            </Box>

            {/* Account Management Section */}
            <Card sx={{ mt: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Account Management
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <List dense>
                                <NavBarItem
                                    to={`/dashboard`}
                                    icon={<ProfileIcon fontSize={"small"} />}
                                    name="My Dashboard"
                                />
                                <NavBarItem
                                    to="/account/email"
                                    icon={<AlternateEmail fontSize={"small"} />}
                                    name="Change Email"
                                />
                                <NavBarItem
                                    to="/account/password/change"
                                    icon={<Password fontSize={"small"} />}
                                    name="Change Password"
                                />
                                {availableRoles.length > 1 && (
                                    <ListItemButton
                                        dense={true}
                                        onClick={handleRoleMenuClick}
                                        alignItems={"center"}
                                    >
                                        <ListItemAvatar sx={{ minWidth: 40 }}>
                                            {activeRole && getRoleConfig(activeRole).icon}
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary="Switch Role"
                                            secondary={activeRole ? getRoleConfig(activeRole).label : "Select Role"}
                                        />
                                        <ExpandMore fontSize={"small"} />
                                    </ListItemButton>
                                )}
                                {config.data.socialaccount ? (
                                    <NavBarItem
                                        to="/account/providers"
                                        icon={<SwitchAccount fontSize={"small"} />}
                                        name="Providers"
                                    />
                                ) : null}
                            </List>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <List dense>
                                {config.data.mfa ? (
                                    <NavBarItem
                                        to="/account/2fa"
                                        icon={<VpnKey fontSize={"small"} />}
                                        name="Two-Factor Authentication"
                                    />
                                ) : null}
                                {config.data.usersessions ? (
                                    <NavBarItem
                                        to="/account/sessions"
                                        icon={<DevicesOther fontSize={"small"} />}
                                        name="Sessions"
                                    />
                                ) : null}
                                <NavBarItem
                                    to="/account/logout"
                                    icon={<Logout fontSize={"small"} />}
                                    name="Sign Out"
                                />
                            </List>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Theme and Font Controls */}
            <Paper sx={{ mt: 3, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Appearance Settings
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <ThemeSwitcher />
                    </Grid>
                </Grid>
            </Paper>

            {/* Role Switch Menu */}
            <Menu
                anchorEl={roleMenuAnchor}
                open={roleMenuOpen}
                onClose={handleRoleMenuClose}
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
                                minWidth: 200,
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
