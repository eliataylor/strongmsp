import { Close as CloseIcon } from "@mui/icons-material";
import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Typography
} from "@mui/material";
import React from "react";
import Signup from "../allauth/account/Signup";

interface SignupModalProps {
    open: boolean;
    onClose: () => void;
}

const SignupModal: React.FC<SignupModalProps> = ({ open, onClose }) => {
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
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pb: 1
            }}>
                <Typography variant="h5" component="h2">
                    Sign Up
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
                    <Signup />
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default SignupModal;
