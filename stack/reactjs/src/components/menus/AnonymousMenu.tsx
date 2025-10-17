import { AppRegistration, Login } from "@mui/icons-material";
import { ListItemAvatar, ListItemButton, ListItemText } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";

const AnonymousMenu: React.FC = () => {
    const location = useLocation();

    return (
        <div id="AnonymousMenuListItems">
            {/* Sign In */}
            <ListItemButton
                component={Link}
                to="/account/login"
                selected={location.pathname === "/account/login"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <Login fontSize="small" color="secondary" />
                </ListItemAvatar>
                <ListItemText primary="Sign In" />
            </ListItemButton>

            {/* Sign Up */}
            <ListItemButton
                component={Link}
                to="/account/signup"
                selected={location.pathname === "/account/signup"}
            >
                <ListItemAvatar style={{ display: "flex" }}>
                    <AppRegistration fontSize="small" color="secondary" />
                </ListItemAvatar>
                <ListItemText primary="Sign Up" />
            </ListItemButton>
        </div>
    );
};

export default AnonymousMenu;
