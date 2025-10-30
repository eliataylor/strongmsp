import { Close as CloseIcon } from "@mui/icons-material";
import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Typography
} from "@mui/material";
import React, { useMemo, useState } from "react";
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

    const title = useMemo(() => {
        if (view === "signup") return "Sign Up";
        if (view === "claim") return "Find My Team";
        return "Sign In";
    }, [view]);

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
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pb: 1
            }}>
                <Typography variant="h5" component="h2">
                    {title}
                </Typography>
                <IconButton
                    aria-label="close"
                    onClick={handleClose}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 3, py: 1 }}>
                <Box sx={{ mt: 2 }}>
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
                        <ClaimTeamForm />
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default LoginModal;
