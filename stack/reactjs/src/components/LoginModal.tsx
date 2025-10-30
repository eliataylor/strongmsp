import { Close as CloseIcon } from "@mui/icons-material";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton
} from "@mui/material";
import React, { useState } from "react";
import Login from "../allauth/account/Login";
import Signup from "../allauth/account/Signup";
import ClaimTeamForm from "./ClaimTeamForm";

interface LoginModalProps {
    open: boolean;
    onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ open, onClose }) => {
    const [view, setView] = useState<"login" | "signup" | "claim">("login");
    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    minHeight: 500
                }
            }}
        >
            <DialogTitle>
                <IconButton
                    aria-label="close"
                    onClick={handleClose}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 2 }}>
                {view === "login" && (
                    <Login
                        onShowSignup={() => setView("signup")}
                        onShowClaim={() => setView("claim")}
                    />
                )}
                {view === "signup" && (
                    <Signup
                        onShowLogin={() => setView("login")}
                        onShowClaim={() => setView("claim")}
                    />
                )}
                {view === "claim" && (
                    <ClaimTeamForm
                        onShowLogin={() => setView("login")}
                        onShowSignup={() => setView("signup")}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};

export default LoginModal;
